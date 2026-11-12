import { useMemo } from 'react'
import { useRows, useStore, nowIso } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'

export interface DoneInfo {
  at: string
  by: string
}

const PREFIX = 'milestone_done:'

/**
 * Échéances cochées « fait » : un réglage partagé par échéance
 * (clé milestone_done:<id>), pour éviter les conflits entre les deux téléphones.
 */
export function useMilestonesDone() {
  const rows = useRows<BaseRow & { key: string; value: DoneInfo | null }>('settings', (r) => r.key.startsWith(PREFIX))
  const { setSetting, memberId } = useStore()
  const done = useMemo(() => {
    const m = new Map<string, DoneInfo>()
    for (const r of rows ?? []) if (r.value?.at) m.set(r.key.slice(PREFIX.length), r.value)
    return m
  }, [rows])
  const setDone = (id: string, value: boolean) => setSetting(PREFIX + id, value ? ({ at: nowIso(), by: memberId } satisfies DoneInfo) : null)
  return { done, setDone }
}
