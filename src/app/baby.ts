import { useMemo } from 'react'
import { useRows, useSetting, useStore, nowIso } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'
import type { BabyEvent } from '@/lib/baby'
import { DEFAULT_MEDS } from '@/content/baby'

export type BabyEventRow = BaseRow & BabyEvent

export function useBabyEvents() {
  const rows = useRows<BabyEventRow>('baby_events')
  return useMemo(() => [...(rows ?? [])].sort((a, b) => b.started_at.localeCompare(a.started_at)), [rows])
}

export function useFeeding() {
  return useSetting<{ breast: boolean; bottle: boolean }>('feeding', { breast: true, bottle: true })
}

export function useMeds() {
  return useSetting<string[]>('meds', DEFAULT_MEDS)
}

/** Actions de saisie (1 appel = 1 ligne synchronisée). */
export function useBabyActions() {
  const { save, patch, remove } = useStore()
  return {
    /** annule une saisie (suppression douce, synchronisée) */
    undo: (row: { id: string }) => remove('baby_events', row.id),
    /** relance un chrono arrêté par erreur */
    resume: (e: BabyEventRow) => patch('baby_events', e.id, { ended_at: null }),
    log: (kind: BabyEvent['kind'], data: BabyEvent['data'], started_at = nowIso(), ended_at: string | null = null) =>
      save('baby_events', { kind, data, started_at, ended_at }),
    start: (kind: 'feed' | 'sleep', data: BabyEvent['data'] = {}) => save('baby_events', { kind, data, started_at: nowIso(), ended_at: null }),
    stop: (e: BabyEventRow) => patch('baby_events', e.id, { ended_at: nowIso() }),
  }
}
