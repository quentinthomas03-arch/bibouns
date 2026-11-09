import { dayNumber } from './pregnancy'

/**
 * Tour de garde des nuits : alternance à partir d'une date, avec des
 * échanges ponctuels. Une "nuit" porte la date du soir où elle commence.
 */
export interface NightShift {
  enabled: boolean
  /** membre de garde la nuit de `startDate` */
  startMember: string
  startDate: string
  /** échanges ponctuels : date → membre */
  overrides: Record<string, string>
}

export function whoOnNight(cfg: NightShift | null, members: string[], date: string): string | null {
  if (!cfg?.enabled || members.length < 2) return null
  if (cfg.overrides[date] && members.includes(cfg.overrides[date])) return cfg.overrides[date]
  const startIdx = Math.max(0, members.indexOf(cfg.startMember))
  const diff = dayNumber(date) - dayNumber(cfg.startDate)
  const idx = (((startIdx + diff) % members.length) + members.length) % members.length
  return members[idx]
}

/** Date de la nuit "en cours" : avant 12 h, on est encore dans la nuit de la veille. */
export function currentNightDate(now: Date): string {
  const d = new Date(now)
  if (d.getHours() < 12) d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
