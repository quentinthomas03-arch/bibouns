import Dexie, { type Table } from 'dexie'
import { TABLES, TABLE_NAMES, type BaseRow, type TableName } from './tables'

/** Une opération en attente d'envoi au serveur. */
export interface OutboxEntry {
  seq?: number
  table: TableName
  rowId: string
  op: 'upsert' | 'update'
  payload: Record<string, unknown>
  attempts: number
  lastError?: string
}

export interface MetaEntry {
  key: string
  value: unknown
}

/**
 * Base locale (IndexedDB) : une copie de chaque table + la file d'envoi.
 * Toute l'interface lit ICI, jamais directement le serveur : l'appli marche
 * donc pareil avec ou sans réseau.
 */
export class BibDb extends Dexie {
  outbox!: Table<OutboxEntry, number>
  deadletter!: Table<OutboxEntry, number>
  meta!: Table<MetaEntry, string>

  constructor(name = 'bibouns') {
    super(name)
    const stores: Record<string, string> = {
      outbox: '++seq, [table+rowId]',
      deadletter: '++seq',
      meta: 'key',
    }
    for (const t of TABLE_NAMES) {
      const extra = ('indexes' in TABLES[t] ? (TABLES[t] as { indexes?: string[] }).indexes : undefined) ?? []
      stores[t] = ['id', 'synced_at', 'updated_at', ...extra].join(', ')
    }
    this.version(1).stores(stores)
  }

  rows<T extends BaseRow = BaseRow>(table: TableName): Table<T, string> {
    return this.table(table) as Table<T, string>
  }
}
