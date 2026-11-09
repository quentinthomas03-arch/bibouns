import { dayNumber } from './pregnancy'

export interface Checkin {
  entry_date: string
  mood?: number | null
  created_by?: string | null
}

/**
 * Faut-il proposer une carte d'aide à ce parent ?
 * Signal doux : au moins 4 jours "difficiles" (humeur ≤ 2) sur les 14 derniers
 * jours, dont le plus ancien date d'au moins 7 jours (ça dure).
 */
export function needsSupport(entries: Checkin[], memberId: string, today: string): boolean {
  const now = dayNumber(today)
  const lowDays = new Set(
    entries.filter((e) => e.created_by === memberId && (e.mood ?? 5) <= 2 && now - dayNumber(e.entry_date) <= 14 && now >= dayNumber(e.entry_date)).map((e) => e.entry_date),
  )
  if (lowDays.size < 4) return false
  const oldest = Math.min(...[...lowDays].map(dayNumber))
  return now - oldest >= 7
}
