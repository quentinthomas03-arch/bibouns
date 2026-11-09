import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid'
import { useCallback } from 'react'
import type { BibDb } from './db'
import type { SyncEngine } from './engine'
import type { BaseRow, TableName } from './tables'
import { useSession } from '@/app/session'

/** Espace de noms pour les identifiants déterministes (réglages, votes...). */
const NS = '6f1c9a52-3b7e-4d2a-9c41-b1b0f5a7e3d1'

export const newId = () => uuidv4()
export const stableId = (...parts: string[]) => uuidv5(parts.join(':'), NS)
export const nowIso = () => new Date().toISOString()

export interface Ctx {
  db: BibDb
  engine: SyncEngine
  householdId: string
  memberId: string
}

/** Crée ou remplace une ligne (complète les colonnes techniques). */
export async function saveRow<T extends object>(ctx: Ctx, table: TableName, fields: T & { id?: string }) {
  const id = fields.id ?? newId()
  const existing = (await ctx.db.rows(table).get(id)) as BaseRow | undefined
  const row: BaseRow = {
    ...existing,
    ...fields,
    id,
    household_id: ctx.householdId,
    created_by: existing?.created_by ?? ctx.memberId,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
    deleted_at: (fields as { deleted_at?: string | null }).deleted_at ?? existing?.deleted_at ?? null,
  }
  await ctx.engine.write(table, row)
  return row
}

/** Hook : accès aux opérations d'écriture du foyer courant. */
export function useStore() {
  const ctx = useSession().ctx!
  const save = useCallback(<T extends object>(table: TableName, fields: T & { id?: string }) => saveRow(ctx, table, fields), [ctx])
  const patch = useCallback((table: TableName, id: string, p: Record<string, unknown>) => ctx.engine.patch(table, id, p), [ctx])
  const remove = useCallback((table: TableName, id: string) => ctx.engine.patch(table, id, { deleted_at: nowIso() }), [ctx])
  const setSetting = useCallback(
    (key: string, value: unknown) => saveRow(ctx, 'settings', { id: stableId(ctx.householdId, 'setting', key), key, value }),
    [ctx],
  )
  return { ...ctx, save, patch, remove, setSetting }
}

/** Hook : lignes vivantes d'une table (se met à jour à chaque modif locale ou distante). */
export function useRows<T extends BaseRow = BaseRow>(
  table: TableName,
  filter?: (row: T) => boolean,
  deps: unknown[] = [],
): T[] | undefined {
  const { ctx } = useSession()
  return useLiveQuery(
    async () => {
      if (!ctx) return []
      const all = (await ctx.db.rows<T>(table).toArray()).filter((r) => !r.deleted_at && (!filter || filter(r)))
      return all
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx, table, ...deps],
  )
}

/** Hook : un réglage partagé du foyer. */
export function useSetting<T>(key: string, fallback: T): T {
  const { ctx } = useSession()
  const value = useLiveQuery(async () => {
    if (!ctx) return undefined
    const row = await ctx.db.rows('settings').get(stableId(ctx.householdId, 'setting', key))
    return row && !row.deleted_at ? (row.value as T) : undefined
  }, [ctx, key])
  return value === undefined || value === null ? fallback : value
}
