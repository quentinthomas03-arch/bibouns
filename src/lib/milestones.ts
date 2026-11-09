import { MILESTONES, type Milestone } from '@/content/milestones'
import { dayNumber, fromDayNumber, TERM_DAYS } from './pregnancy'

export interface DatedMilestone extends Milestone {
  start: string // AAAA-MM-JJ
  end: string
  status: 'past' | 'now' | 'soon' | 'later'
}

/**
 * Calcule les dates de chaque échéance à partir de la date prévue
 * (et de la date de naissance réelle si connue).
 * "soon" = commence dans les 30 prochains jours.
 */
export function datedMilestones(
  dueDate: string,
  bornAt: string | null = null,
  today: Date | string = new Date(),
  list: Milestone[] = MILESTONES,
): DatedMilestone[] {
  const lmp = dayNumber(dueDate) - TERM_DAYS
  const birth = dayNumber(bornAt ?? dueDate)
  const now = dayNumber(today)
  return list
    .map((m) => {
      let s: number
      let e: number
      if ('sa' in m.anchor) {
        s = lmp + m.anchor.sa[0] * 7
        e = lmp + m.anchor.sa[1] * 7 + 6
      } else if ('due' in m.anchor) {
        s = e = dayNumber(dueDate) + m.anchor.due
      } else {
        s = birth + m.anchor.birth[0]
        e = birth + m.anchor.birth[1]
      }
      const status: DatedMilestone['status'] = e < now ? 'past' : s <= now ? 'now' : s - now <= 30 ? 'soon' : 'later'
      return { ...m, start: fromDayNumber(s), end: fromDayNumber(e), status }
    })
    .sort((a, b) => a.start.localeCompare(b.start))
}

export function formatRange(start: string, end: string): string {
  const f = (d: string, withYear = false) =>
    new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })
  return start === end ? f(start, true) : `${f(start)} → ${f(end, true)}`
}
