/**
 * Déclaration des tables synchronisées.
 *  - mode "rw"     : lecture + écriture par upsert (cas général)
 *  - mode "update" : lecture + mise à jour partielle uniquement (profil membre)
 *  - mode "read"   : lecture seule (foyer)
 *  - indexes       : index Dexie supplémentaires (en plus de id, synced_at)
 *  - select        : colonnes à lire côté serveur ("*" par défaut)
 */
export type TableMode = 'rw' | 'update' | 'read'

export interface TableDef {
  mode: TableMode
  indexes?: string[]
  select?: string
  /** colonne de filtre foyer pour le temps réel */
  householdColumn?: string
}

export const TABLES = {
  households: { mode: 'read', householdColumn: 'id', select: 'id,name,invite_code,invite_expires_at,created_at,updated_at,synced_at' },
  members: {
    mode: 'update',
    select: 'id,household_id,user_id,first_name,color,avatar,created_at,updated_at,synced_at',
  },
  settings: { mode: 'rw', indexes: ['key'] },
  notes: { mode: 'rw', indexes: ['created_at'] },
  appointments: { mode: 'rw', indexes: ['starts_at', 'subject'] },
  journal_entries: { mode: 'rw', indexes: ['entry_date'] },
  measurements: { mode: 'rw', indexes: ['kind', 'measured_at'] },
  checklists: { mode: 'rw', indexes: ['position'] },
  checklist_items: { mode: 'rw', indexes: ['checklist_id'] },
  custom_names: { mode: 'rw', indexes: ['name'] },
  name_votes: { mode: 'rw', indexes: ['name'] },
  name_matches: { mode: 'rw', indexes: ['name'] },
  contractions: { mode: 'rw', indexes: ['started_at'] },
  babies: { mode: 'rw' },
  baby_events: { mode: 'rw', indexes: ['kind', 'started_at'] },
  growth: { mode: 'rw', indexes: ['measured_on'] },
  vaccines: { mode: 'rw', indexes: ['code'] },
  documents: { mode: 'rw', indexes: ['doc_date'] },
  memories: { mode: 'rw', indexes: ['memory_date'] },
} satisfies Record<string, TableDef>

export type TableName = keyof typeof TABLES
export const TABLE_NAMES = Object.keys(TABLES) as TableName[]

export function tableDef(name: TableName): TableDef {
  return TABLES[name]
}

/** Colonnes techniques communes */
export interface BaseRow {
  id: string
  household_id: string
  created_by?: string | null
  created_at?: string
  updated_at: string
  synced_at?: string
  deleted_at?: string | null
  [key: string]: unknown
}
