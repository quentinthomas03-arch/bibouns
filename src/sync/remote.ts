import type { BaseRow, TableName } from './tables'

/** Erreur côté serveur ; `network` = on réessaiera plus tard sans compter d'échec. */
export class RemoteError extends Error {
  constructor(message: string, public network: boolean) {
    super(message)
  }
}

export type RealtimeStatus = 'connecting' | 'live' | 'down'

/** Ce dont le moteur de synchro a besoin du serveur (facile à simuler en test). */
export interface Remote {
  upsert(table: TableName, rows: Record<string, unknown>[]): Promise<void>
  update(table: TableName, id: string, patch: Record<string, unknown>): Promise<void>
  pullSince(table: TableName, since: string | null, limit: number): Promise<BaseRow[]>
  subscribe(
    householdId: string,
    tables: TableName[],
    onRow: (table: TableName, row: BaseRow) => void,
    onStatus: (s: RealtimeStatus) => void,
  ): () => void
}
