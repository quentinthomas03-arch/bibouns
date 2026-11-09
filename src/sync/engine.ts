import type { BibDb, OutboxEntry } from './db'
import { RemoteError, type RealtimeStatus, type Remote } from './remote'
import { TABLE_NAMES, tableDef, type BaseRow, type TableName } from './tables'

/**
 * Moteur de synchronisation "hors ligne d'abord".
 *
 * Écriture : la ligne est enregistrée localement ET ajoutée à la file d'envoi
 * (outbox) dans une même transaction. L'interface se met à jour tout de suite.
 *
 * Envoi (flush) : la file est envoyée dans l'ordre. Chaque ligne a un id
 * généré par le téléphone, donc renvoyer deux fois la même ligne ne crée
 * jamais de doublon (upsert). Une entrée n'est retirée de la file qu'une fois
 * le serveur a confirmé => aucune perte si le réseau coupe en plein envoi.
 *
 * Réception : (1) temps réel via Supabase Realtime, (2) rattrapage (pull)
 * depuis le dernier curseur `synced_at`, avec une marge de recouvrement.
 *
 * Conflits : "la dernière modification gagne" (updated_at), arbitré par le
 * serveur. Une ligne qui a encore des modifs locales en attente n'est pas
 * écrasée par le serveur avant leur envoi.
 */

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error'

export interface SyncStatus {
  state: SyncState
  pending: number
  realtime: RealtimeStatus
  lastSyncAt: string | null
  lastError?: string
}

const PULL_PAGE = 500
const PULL_OVERLAP_MS = 60_000
const MAX_ATTEMPTS = 5

const time = (s: string | null | undefined) => (s ? Date.parse(s) : 0)

export class SyncEngine {
  private flusher = new Serial(() => this.doFlush())
  private puller = new Serial(() => this.doPull())
  private unsubscribe: (() => void) | null = null
  private timers: Array<() => void> = []
  private listeners = new Set<(s: SyncStatus) => void>()
  status: SyncStatus = { state: 'idle', pending: 0, realtime: 'connecting', lastSyncAt: null }

  constructor(
    private db: BibDb,
    private remote: Remote,
    private householdId: string,
    private tables: TableName[] = TABLE_NAMES,
  ) {}

  // ---------------------------------------------------------------- statut
  onStatus(fn: (s: SyncStatus) => void): () => void {
    this.listeners.add(fn)
    fn(this.status)
    return () => this.listeners.delete(fn)
  }

  private async setStatus(patch: Partial<SyncStatus>) {
    const pending = await this.db.outbox.count()
    this.status = { ...this.status, ...patch, pending }
    for (const fn of this.listeners) fn(this.status)
  }

  // ---------------------------------------------------------------- écriture
  /** Crée ou remplace une ligne complète (tables en mode "rw"). */
  async write(table: TableName, row: BaseRow): Promise<void> {
    if (tableDef(table).mode !== 'rw') throw new Error(`Table ${table} non modifiable par upsert`)
    await this.db.transaction('rw', this.db.table(table), this.db.outbox, async () => {
      await this.db.table(table).put(row)
      await this.db.outbox.add({ table, rowId: row.id, op: 'upsert', payload: stripLocal(row), attempts: 0 })
    })
    await this.setStatus({})
    void this.flush()
  }

  /** Mise à jour partielle (ex. profil membre). */
  async patch(table: TableName, id: string, patch: Record<string, unknown>): Promise<void> {
    const mode = tableDef(table).mode
    if (mode === 'read') throw new Error(`Table ${table} en lecture seule`)
    const updated_at = new Date().toISOString()
    await this.db.transaction('rw', this.db.table(table), this.db.outbox, async () => {
      const current = (await this.db.table(table).get(id)) as BaseRow | undefined
      if (!current) throw new Error(`Ligne ${table}/${id} introuvable`)
      const next = { ...current, ...patch, updated_at }
      await this.db.table(table).put(next)
      await this.db.outbox.add(
        mode === 'rw'
          ? { table, rowId: id, op: 'upsert', payload: stripLocal(next), attempts: 0 }
          : { table, rowId: id, op: 'update', payload: { ...patch, updated_at }, attempts: 0 },
      )
    })
    await this.setStatus({})
    void this.flush()
  }

  // ---------------------------------------------------------------- envoi
  /** Envoie la file. Un appel pendant un envoi en cours en relance un après. */
  flush(): Promise<void> {
    return this.flusher.run()
  }

  private async doFlush(): Promise<void> {
    // On boucle tant que de nouvelles entrées arrivent pendant l'envoi.
    for (;;) {
      const entries = await this.db.outbox.orderBy('seq').toArray()
      if (entries.length === 0) {
        await this.setStatus({ state: 'idle', lastError: undefined })
        return
      }
      await this.setStatus({ state: 'syncing' })

      // Regroupe par table/ligne : seule la dernière version d'un upsert compte ;
      // les "update" partiels sont fusionnés dans l'ordre.
      const groups = new Map<string, { table: TableName; op: OutboxEntry['op']; payload: Record<string, unknown>; seqs: number[]; attempts: number }>()
      for (const e of entries) {
        const key = `${e.table}/${e.rowId}`
        const g = groups.get(key)
        if (g && g.op === e.op) {
          g.payload = e.op === 'upsert' ? e.payload : { ...g.payload, ...e.payload }
          g.seqs.push(e.seq!)
          g.attempts = Math.max(g.attempts, e.attempts)
        } else if (!g) {
          groups.set(key, { table: e.table, op: e.op, payload: e.payload, seqs: [e.seq!], attempts: e.attempts })
        } else {
          // mélange upsert/update sur la même ligne (rare) : on traite dans l'ordre au tour suivant
          continue
        }
      }

      // Envoi groupé par table pour les upserts (respecte l'ordre d'apparition des tables
      // pour que les listes soient créées avant leurs éléments).
      const byTable = new Map<TableName, Array<{ payload: Record<string, unknown>; seqs: number[]; attempts: number }>>()
      const updates: Array<{ table: TableName; id: string; payload: Record<string, unknown>; seqs: number[]; attempts: number }> = []
      for (const [key, g] of groups) {
        if (g.op === 'upsert') {
          if (!byTable.has(g.table)) byTable.set(g.table, [])
          byTable.get(g.table)!.push(g)
        } else {
          updates.push({ table: g.table, id: key.split('/')[1], payload: g.payload, seqs: g.seqs, attempts: g.attempts })
        }
      }

      let failure: string | null = null
      try {
        for (const [table, items] of byTable) {
          try {
            await this.remote.upsert(table, items.map((i) => i.payload))
            await this.db.outbox.bulkDelete(items.flatMap((i) => i.seqs))
          } catch (err) {
            if (err instanceof RemoteError && err.network) throw err
            // Le lot est refusé : on isole la ou les lignes fautives.
            for (const item of items) {
              try {
                await this.sendOrFail([item], () => this.remote.upsert(table, [item.payload]))
              } catch (e) {
                if (e instanceof RemoteError && e.network) throw e
                failure = String((e as Error).message ?? e)
              }
            }
          }
        }
        for (const u of updates) {
          try {
            await this.sendOrFail([u], () => this.remote.update(u.table, u.id, u.payload))
          } catch (e) {
            if (e instanceof RemoteError && e.network) throw e
            failure = String((e as Error).message ?? e)
          }
        }
      } catch (err) {
        await this.setStatus({ state: 'offline', lastError: (err as Error).message })
        return
      }
      if (failure) {
        // On ne reboucle pas immédiatement sur une erreur serveur : prochain essai plus tard.
        await this.setStatus({ state: 'error', lastError: failure })
        return
      }
      await this.setStatus({ lastSyncAt: new Date().toISOString() })
    }
  }

  /** Envoie un lot ; en cas d'erreur non réseau, compte l'échec (et met de côté après 5). */
  private async sendOrFail(items: Array<{ seqs: number[]; attempts: number }>, send: () => Promise<void>) {
    const seqs = items.flatMap((i) => i.seqs)
    try {
      await send()
      await this.db.outbox.bulkDelete(seqs)
    } catch (err) {
      if (err instanceof RemoteError && err.network) throw err
      const message = String((err as Error).message ?? err)
      await this.db.transaction('rw', this.db.outbox, this.db.deadletter, async () => {
        for (const seq of seqs) {
          const e = await this.db.outbox.get(seq)
          if (!e) continue
          const attempts = e.attempts + 1
          if (attempts >= MAX_ATTEMPTS) {
            await this.db.deadletter.add({ ...e, attempts, lastError: message })
            await this.db.outbox.delete(seq)
          } else {
            await this.db.outbox.update(seq, { attempts, lastError: message })
          }
        }
      })
      throw err
    }
  }

  // ---------------------------------------------------------------- réception
  /** Fusionne une ligne venant du serveur dans la base locale. */
  async merge(table: TableName, row: BaseRow): Promise<void> {
    await this.db.transaction('rw', this.db.table(table), this.db.outbox, async () => {
      const pending = await this.db.outbox.where('[table+rowId]').equals([table, row.id]).count()
      if (pending > 0) return // nos modifs locales partiront d'abord ; le serveur arbitrera
      const local = (await this.db.table(table).get(row.id)) as BaseRow | undefined
      if (!local || time(row.updated_at) >= time(local.updated_at) || time(row.synced_at) > time(local.synced_at)) {
        await this.db.table(table).put(row)
      }
    })
  }

  pull(): Promise<void> {
    return this.puller.run()
  }

  private async doPull(): Promise<void> {
    try {
      for (const table of this.tables) {
        const metaKey = `cursor:${table}`
        const stored = (await this.db.meta.get(metaKey))?.value as string | undefined
        let since = stored ? new Date(time(stored) - PULL_OVERLAP_MS).toISOString() : null
        let maxSeen = stored ?? null
        for (;;) {
          const rows = await this.remote.pullSince(table, since, PULL_PAGE)
          for (const row of rows) {
            await this.merge(table, row)
            if (row.synced_at && time(row.synced_at) > time(maxSeen)) maxSeen = row.synced_at
          }
          if (rows.length < PULL_PAGE) break
          since = rows[rows.length - 1].synced_at ?? since
        }
        if (maxSeen) await this.db.meta.put({ key: metaKey, value: maxSeen })
      }
      await this.setStatus({ lastSyncAt: new Date().toISOString() })
    } catch (err) {
      if (err instanceof RemoteError && err.network) {
        await this.setStatus({ state: 'offline', lastError: err.message })
        return
      }
      await this.setStatus({ state: 'error', lastError: String((err as Error).message ?? err) })
    }
  }

  /** Envoi puis réception : à appeler au retour du réseau / de l'appli. */
  async syncNow(): Promise<void> {
    await this.flush()
    await this.pull()
  }

  // ---------------------------------------------------------------- cycle de vie
  start(): void {
    this.unsubscribe = this.remote.subscribe(
      this.householdId,
      this.tables,
      (table, row) => void this.merge(table, row),
      (realtime) => {
        void this.setStatus({ realtime })
        // À chaque (re)connexion du temps réel : rattrapage de ce qu'on a raté.
        if (realtime === 'live') void this.syncNow()
      },
    )
    if (typeof window !== 'undefined') {
      const onOnline = () => void this.syncNow()
      const onVisible = () => document.visibilityState === 'visible' && void this.syncNow()
      window.addEventListener('online', onOnline)
      document.addEventListener('visibilitychange', onVisible)
      const interval = window.setInterval(() => void this.syncNow(), 60_000)
      this.timers.push(
        () => window.removeEventListener('online', onOnline),
        () => document.removeEventListener('visibilitychange', onVisible),
        () => window.clearInterval(interval),
      )
    }
    void this.syncNow()
  }

  stop(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.timers.forEach((t) => t())
    this.timers = []
  }
}

/**
 * Exécute une tâche asynchrone sans chevauchement : si elle tourne déjà,
 * un seul nouveau passage est programmé juste après (les appels se regroupent).
 */
class Serial {
  private running: Promise<void> | null = null
  private queued: Promise<void> | null = null
  constructor(private task: () => Promise<void>) {}

  run(): Promise<void> {
    if (!this.running) {
      this.running = this.task().finally(() => {
        this.running = null
      })
      return this.running
    }
    if (!this.queued) {
      this.queued = this.running.then(() => {
        this.queued = null
        return this.run()
      })
    }
    return this.queued
  }
}

/** Retire les champs gérés uniquement par le serveur avant envoi. */
function stripLocal(row: BaseRow): Record<string, unknown> {
  const { synced_at: _s, ...rest } = row
  return rest
}
