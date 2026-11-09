import { currentPhase, type Phase } from '@/lib/phase'
import { useRows, useSetting } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'

/** Phase courante de l'appli (Avant / Jour J / Après), calculée depuis les réglages partagés. */
export function usePhase() {
  const dueDate = useSetting<string | null>('due_date', null)
  const manual = useSetting<Phase | null>('phase_manual', null)
  const laborStarted = useSetting<boolean>('labor_started', false)
  const baby = (useRows<BaseRow & { born_at?: string | null }>('babies') ?? [])[0]
  const phase = currentPhase({ dueDate, bornAt: baby?.born_at ?? null, laborStarted, manual })
  return { phase, dueDate, manual, baby }
}
