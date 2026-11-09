import { RemoteError, type RealtimeStatus, type Remote } from '../src/sync/remote'
import type { BaseRow, TableName } from '../src/sync/tables'

/**
 * Faux serveur en mémoire qui reproduit les règles de la base :
 * upsert idempotent, "dernière modif gagne", synced_at serveur, temps réel.
 */
export class FakeRemote implements Remote {
  data = new Map<string, Map<string, BaseRow>>()
  online = true
  failNext = 0
  rejectIds = new Set<string>()
  calls = 0
  private clock = Date.parse('2026-01-01T00:00:00Z')
  private subs: Array<{ hid: string; onRow: (t: TableName, r: BaseRow) => void; onStatus: (s: RealtimeStatus) => void }> = []

  private tick() {
    this.clock += 1000
    return new Date(this.clock).toISOString()
  }
  private table(t: string) {
    if (!this.data.has(t)) this.data.set(t, new Map())
    return this.data.get(t)!
  }
  private guard() {
    this.calls++
    if (!this.online) throw new RemoteError('Load failed', true)
    if (this.failNext > 0) {
      this.failNext--
      throw new RemoteError('Load failed', true)
    }
  }
  private emit(t: TableName, row: BaseRow) {
    for (const s of this.subs) if (s.hid === row.household_id) s.onRow(t, structuredClone(row))
  }

  async upsert(t: TableName, rows: Record<string, unknown>[]) {
    this.guard()
    for (const r of rows) if (this.rejectIds.has(r.id as string)) throw new RemoteError('violates check constraint', false)
    for (const r of rows) {
      const incoming = r as BaseRow
      const existing = this.table(t).get(incoming.id)
      let next: BaseRow
      if (existing && Date.parse(incoming.updated_at) < Date.parse(existing.updated_at)) {
        next = { ...existing, synced_at: this.tick() }
      } else {
        next = { ...existing, ...incoming, synced_at: this.tick() }
      }
      this.table(t).set(incoming.id, next)
      this.emit(t, next)
    }
  }

  async update(t: TableName, id: string, patch: Record<string, unknown>) {
    this.guard()
    const existing = this.table(t).get(id)
    if (!existing) return
    const next = { ...existing, ...patch, synced_at: this.tick() } as BaseRow
    this.table(t).set(id, next)
    this.emit(t, next)
  }

  async pullSince(t: TableName, since: string | null, limit: number) {
    this.guard()
    return [...this.table(t).values()]
      .filter((r) => !since || Date.parse(r.synced_at!) > Date.parse(since))
      .sort((a, b) => Date.parse(a.synced_at!) - Date.parse(b.synced_at!))
      .slice(0, limit)
      .map((r) => structuredClone(r))
  }

  subscribe(hid: string, _tables: TableName[], onRow: (t: TableName, r: BaseRow) => void, onStatus: (s: RealtimeStatus) => void) {
    const sub = { hid, onRow, onStatus }
    this.subs.push(sub)
    onStatus('live')
    return () => {
      this.subs = this.subs.filter((s) => s !== sub)
    }
  }

  /** Écriture directe "par l'autre téléphone" */
  serverWrite(t: TableName, row: BaseRow) {
    const next = { ...row, synced_at: this.tick() }
    this.table(t).set(row.id, next)
    this.emit(t, next)
  }
}
