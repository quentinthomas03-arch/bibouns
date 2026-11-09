import { dayNumber } from './pregnancy'

export type Phase = 'before' | 'dday' | 'after'

export interface PhaseInput {
  dueDate: string | null
  /** date/heure de naissance réelle (null tant que bébé n'est pas né) */
  bornAt: string | null
  /** vrai quand on a appuyé sur "Ça y est" (travail en cours) */
  laborStarted: boolean
  /** bascule manuelle (prioritaire) */
  manual: Phase | null
  today?: Date
}

/**
 * Phase affichée :
 *  1. bascule manuelle si définie ;
 *  2. "après" dès que la naissance est saisie ;
 *  3. "Jour J" si le travail a commencé ou si la date prévue est atteinte ;
 *  4. sinon "avant".
 */
export function currentPhase({ dueDate, bornAt, laborStarted, manual, today = new Date() }: PhaseInput): Phase {
  if (manual) return manual
  if (bornAt) return 'after'
  if (laborStarted) return 'dday'
  if (dueDate && dayNumber(today) >= dayNumber(dueDate)) return 'dday'
  return 'before'
}
