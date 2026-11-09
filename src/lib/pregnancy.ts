/**
 * Calculs de grossesse — convention française.
 *
 *   Date prévue d'accouchement (DPA) = date des dernières règles (DDR) + 287 jours
 *   (soit 41 semaines d'aménorrhée, SA). Début de grossesse ≈ DDR + 14 jours.
 *
 * Toutes les dates sont manipulées en "jours calendaires" (AAAA-MM-JJ) pour
 * éviter les pièges de fuseau horaire et de changement d'heure.
 */

export const TERM_DAYS = 287 // 41 SA
export const MS_PER_DAY = 86_400_000

/** "2027-05-04" -> nombre de jours depuis l'époque (UTC, sans heure) */
export function dayNumber(date: string | Date): number {
  if (typeof date === 'string') {
    const [y, m, d] = date.slice(0, 10).split('-').map(Number)
    return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY)
  }
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY)
}

export function fromDayNumber(n: number): string {
  return new Date(n * MS_PER_DAY).toISOString().slice(0, 10)
}

export function lmpFromDueDate(dueDate: string): string {
  return fromDayNumber(dayNumber(dueDate) - TERM_DAYS)
}

export interface PregnancyProgress {
  /** jours depuis la DDR */
  daysSinceLmp: number
  /** semaines révolues d'aménorrhée (ex. 16 pour "16 SA + 3 j") */
  weeks: number
  /** jours en plus des semaines révolues (0-6) */
  days: number
  /** semaine en cours (ex. 17e semaine quand on est à 16 SA + 3 j) */
  currentWeek: number
  /** mois de grossesse en cours (1-9), compté depuis le début de grossesse */
  month: number
  /** jours restants avant la DPA (négatif = terme dépassé) */
  daysLeft: number
  /** progression 0..1 */
  progress: number
  trimester: 1 | 2 | 3
}

export function pregnancyProgress(dueDate: string, today: Date | string = new Date()): PregnancyProgress {
  const due = dayNumber(dueDate)
  const now = dayNumber(today)
  const lmp = due - TERM_DAYS
  const daysSinceLmp = now - lmp
  const weeks = Math.floor(daysSinceLmp / 7)
  const days = daysSinceLmp - weeks * 7
  const sinceConception = daysSinceLmp - 14
  const month = clamp(Math.floor(sinceConception / 30.4375) + 1, 1, 9)
  // Trimestres (convention française usuelle) : T1 jusqu'à 15 SA révolues, T2 jusqu'à 28 SA
  const trimester = weeks < 15 ? 1 : weeks < 28 ? 2 : 3
  return {
    daysSinceLmp,
    weeks,
    days,
    currentWeek: weeks + 1,
    month,
    daysLeft: due - now,
    progress: clamp(daysSinceLmp / TERM_DAYS, 0, 1),
    trimester,
  }
}

export function formatSA(p: Pick<PregnancyProgress, 'weeks' | 'days'>): string {
  return p.days > 0 ? `${p.weeks} SA + ${p.days} j` : `${p.weeks} SA`
}

// ---------------------------------------------------------------- âge du bébé

export interface BabyAge {
  days: number
  weeks: number
  /** mois calendaires révolus */
  months: number
  /** jours en plus des mois révolus */
  daysAfterMonths: number
}

export function babyAge(birth: string | Date, today: Date | string = new Date()): BabyAge {
  const b = typeof birth === 'string' ? parseDay(birth) : birth
  const t = typeof today === 'string' ? parseDay(today) : today
  const days = dayNumber(t) - dayNumber(b)
  let months = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth())
  if (t.getDate() < b.getDate()) months--
  months = Math.max(0, months)
  const anchor = addMonths(b, months)
  return { days, weeks: Math.floor(days / 7), months, daysAfterMonths: dayNumber(t) - dayNumber(anchor) }
}

export function formatBabyAge(a: BabyAge): string {
  if (a.days < 0) return 'pas encore né·e'
  if (a.days === 0) return 'né·e aujourd’hui'
  if (a.days < 14) return `${a.days} jour${a.days > 1 ? 's' : ''}`
  if (a.months < 2) {
    const w = a.weeks
    const d = a.days - w * 7
    return `${w} semaines${d ? ` et ${d} j` : ''}`
  }
  if (a.months < 24) return `${a.months} mois${a.daysAfterMonths ? ` et ${a.daysAfterMonths} j` : ''}`
  const y = Math.floor(a.months / 12)
  const m = a.months % 12
  return `${y} ans${m ? ` et ${m} mois` : ''}`
}

/** Ajoute des mois en restant au dernier jour du mois si besoin (31 janv + 1 mois = 28/29 févr.) */
function addMonths(d: Date, months: number): Date {
  const y = d.getFullYear()
  const m = d.getMonth() + months
  const last = new Date(y, m + 1, 0).getDate()
  return new Date(y, m, Math.min(d.getDate(), last))
}

function parseDay(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}
