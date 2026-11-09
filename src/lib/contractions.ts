/**
 * Chrono des contractions : durée, intervalle (début → début), régularité,
 * et comparaison avec le repère courant pour un premier bébé
 * (contractions régulières toutes les 5 min environ, depuis ~2 h).
 * C'est un REPÈRE affiché, jamais une décision médicale.
 */

export interface Contraction {
  id?: string
  started_at: string
  ended_at?: string | null
}

export interface RuleSettings {
  /** intervalle maximal (min) */
  intervalMin: number
  /** durée minimale pendant laquelle le rythme doit tenir (min) */
  sustainMin: number
}

export const FIRST_BABY_RULE: RuleSettings = { intervalMin: 5, sustainMin: 120 }

export type RuleState = 'none' | 'early' | 'close' | 'reached'

export interface ContractionStats {
  count: number
  lastHourCount: number
  avgDurationSec: number | null
  avgIntervalMin: number | null
  regular: boolean
  /** depuis combien de minutes l'intervalle reste ≤ au repère (+ marge) */
  sustainedMin: number
  state: RuleState
}

const t = (s: string) => Date.parse(s)

export function contractionStats(list: Contraction[], now: Date = new Date(), rule: RuleSettings = FIRST_BABY_RULE): ContractionStats {
  const all = [...list].sort((a, b) => a.started_at.localeCompare(b.started_at))
  const done = all.filter((c) => c.ended_at)
  const hourAgo = now.getTime() - 60 * 60_000
  const recent = done.filter((c) => t(c.started_at) >= hourAgo)
  const durations = recent.map((c) => (t(c.ended_at!) - t(c.started_at)) / 1000)
  const intervals: number[] = []
  for (let i = 1; i < all.length; i++) {
    if (t(all[i].started_at) >= hourAgo) intervals.push((t(all[i].started_at) - t(all[i - 1].started_at)) / 60_000)
  }
  const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null)
  const avgInterval = mean(intervals)
  const sd = avgInterval !== null && intervals.length > 1 ? Math.sqrt(mean(intervals.map((x) => (x - avgInterval) ** 2))!) : null
  const regular = sd !== null && avgInterval !== null && intervals.length >= 3 && sd / avgInterval <= 0.3

  // Durée pendant laquelle le rythme "≤ repère" tient, en remontant depuis la dernière contraction
  const tolerance = rule.intervalMin * 1.2 // petite marge (6 min pour 5 min)
  let sustainedFrom: number | null = null
  for (let i = all.length - 1; i >= 1; i--) {
    const gap = (t(all[i].started_at) - t(all[i - 1].started_at)) / 60_000
    if (gap > tolerance) break
    sustainedFrom = t(all[i - 1].started_at)
  }
  // Si la dernière contraction est trop ancienne, le rythme est rompu
  const last = all.at(-1)
  const stale = !last || (now.getTime() - t(last.started_at)) / 60_000 > tolerance * 1.5
  const sustainedMin = sustainedFrom && !stale ? Math.round((now.getTime() - sustainedFrom) / 60_000) : 0

  let state: RuleState = 'none'
  if (all.length >= 2) {
    if (sustainedMin >= rule.sustainMin && regular) state = 'reached'
    else if (sustainedMin >= 30 && avgInterval !== null && avgInterval <= tolerance) state = 'close'
    else state = 'early'
  }
  return {
    count: all.length,
    lastHourCount: all.filter((c) => t(c.started_at) >= hourAgo).length,
    avgDurationSec: durations.length ? Math.round(mean(durations)!) : null,
    avgIntervalMin: avgInterval !== null ? Math.round(avgInterval * 10) / 10 : null,
    regular,
    sustainedMin,
    state,
  }
}

export function formatSec(s: number): string {
  const m = Math.floor(s / 60)
  const r = Math.round(s % 60)
  return m ? `${m} min ${String(r).padStart(2, '0')}` : `${r} s`
}
