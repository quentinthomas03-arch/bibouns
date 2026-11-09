import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { RemoteError, type RealtimeStatus, type Remote } from './remote'
import { tableDef, type BaseRow, type TableName } from './tables'

const NETWORK_RE = /fetch|network|load failed|timeout|offline/i

function toError(error: { message?: string; code?: string } | null, status?: number): RemoteError | null {
  if (!error) return null
  const msg = error.message ?? 'Erreur inconnue'
  const network = status === 0 || NETWORK_RE.test(msg) || (typeof navigator !== 'undefined' && !navigator.onLine)
  return new RemoteError(msg, network)
}

async function call<T extends { error: { message?: string } | null; status?: number }>(p: PromiseLike<T>): Promise<T> {
  try {
    const res = await p
    const err = toError(res.error, res.status)
    if (err) throw err
    return res
  } catch (e) {
    if (e instanceof RemoteError) throw e
    throw new RemoteError(String((e as Error)?.message ?? e), true)
  }
}

/** Implémentation réelle du "serveur" pour le moteur de synchro. */
export class SupabaseRemote implements Remote {
  constructor(private client: SupabaseClient) {}

  async upsert(table: TableName, rows: Record<string, unknown>[]) {
    await call(this.client.from(table).upsert(rows, { onConflict: 'id' }))
  }

  async update(table: TableName, id: string, patch: Record<string, unknown>) {
    await call(this.client.from(table).update(patch).eq('id', id))
  }

  async pullSince(table: TableName, since: string | null, limit: number) {
    let q = this.client
      .from(table)
      .select(tableDef(table).select ?? '*')
      .order('synced_at', { ascending: true })
      .limit(limit)
    if (since) q = q.gt('synced_at', since)
    const res = await call(q)
    return (res.data ?? []) as unknown as BaseRow[]
  }

  subscribe(
    householdId: string,
    tables: TableName[],
    onRow: (table: TableName, row: BaseRow) => void,
    onStatus: (s: RealtimeStatus) => void,
  ) {
    let channel: RealtimeChannel = this.client.channel(`household:${householdId}`)
    for (const table of tables) {
      const col = tableDef(table).householdColumn ?? 'household_id'
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `${col}=eq.${householdId}` },
        (payload) => {
          if (payload.new && 'id' in payload.new) onRow(table, payload.new as BaseRow)
        },
      )
    }
    onStatus('connecting')
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') onStatus('live')
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onStatus('down')
    })
    return () => {
      void this.client.removeChannel(channel)
    }
  }
}
