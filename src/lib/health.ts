import { CHILD_EXAMS, VACCINES, type VaccineDose } from '@/content/health'
import { dayNumber, fromDayNumber } from './pregnancy'

/** Ajoute des mois calendaires à une date AAAA-MM-JJ (fin de mois respectée). */
export function addMonthsISO(date: string, months: number): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate()
  const r = new Date(Date.UTC(y, m - 1 + months, Math.min(d, last)))
  return r.toISOString().slice(0, 10)
}

export interface VaccineRow {
  code: string
  due_date?: string | null
  done_on?: string | null
  lot?: string | null
  notes?: string | null
}

export type DoseStatus = 'done' | 'late' | 'due' | 'soon' | 'later'

export interface ScheduledDose extends VaccineDose {
  due: string
  status: DoseStatus
  row?: VaccineRow
}

/**
 * Calendrier personnalisé : date conseillée = naissance + âge.
 * "due" = dans la fenêtre (±15 j), "soon" = dans les 30 j, "late" = > 30 j de retard.
 */
export function vaccineSchedule(birth: string, rows: VaccineRow[], today: string): ScheduledDose[] {
  const now = dayNumber(today)
  return VACCINES.map((v) => {
    const row = rows.find((r) => r.code === v.code)
    const due = row?.due_date ?? addMonthsISO(birth, v.months)
    const diff = dayNumber(due) - now
    const status: DoseStatus = row?.done_on ? 'done' : diff < -30 ? 'late' : diff <= 15 ? 'due' : diff <= 30 ? 'soon' : 'later'
    return { ...v, due, status, row }
  })
}

/**
 * Date indicative de la prévention VRS (bronchiolite) pour la 1re saison :
 * naissance pendant la campagne (15 sept. → fin février) => à la naissance ;
 * sinon => début de la campagne suivante (15 septembre).
 */
export function rsvDate(birth: string): { date: string; atBirth: boolean } {
  const [y, m, d] = birth.slice(0, 10).split('-').map(Number)
  const inCampaign = m >= 10 || m <= 2 || (m === 9 && d >= 15)
  if (inCampaign) return { date: birth.slice(0, 10), atBirth: true }
  return { date: `${y}-09-15`, atBirth: false }
}

export function examSchedule(birth: string) {
  return CHILD_EXAMS.map((e) => {
    const start = e.months !== undefined ? addMonthsISO(birth, e.months) : fromDayNumber(dayNumber(birth) + (e.days ?? 0))
    const end = e.windowDays ? fromDayNumber(dayNumber(start) + e.windowDays) : start
    return { ...e, start, end }
  })
}
