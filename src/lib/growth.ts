import WHO from '@/content/growth-who.json'
import { dayNumber } from './pregnancy'

/**
 * Courbes de croissance OMS (méthode LMS).
 *   valeur au z-score z :  X = M · (1 + L·S·z)^(1/L)
 *   z-score d'une mesure : z = ((X/M)^L − 1) / (L·S)
 * Tables hebdomadaires de 0 à 104 semaines, interpolées linéairement.
 */

export type GrowthKey = 'weight' | 'length' | 'head'
export type Sex = 'm' | 'f'
type LMS = [number, number, number]

const STEP = WHO.stepDays
const table = (key: GrowthKey, sex: Sex) => (WHO as unknown as Record<string, LMS[]>)[`${key}_${sex}`]
export const MAX_DAYS = WHO.maxDays
export const GROWTH_SOURCE = WHO.source

export function lmsAt(key: GrowthKey, sex: Sex, ageDays: number): LMS | null {
  if (ageDays < 0 || ageDays > MAX_DAYS) return null
  const t = table(key, sex)
  const i = Math.floor(ageDays / STEP)
  const f = (ageDays - i * STEP) / STEP
  const a = t[i]
  const b = t[Math.min(i + 1, t.length - 1)]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}

export function valueAtZ([L, M, S]: LMS, z: number): number {
  return L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L)
}

export function zScore(x: number, [L, M, S]: LMS): number {
  return L === 0 ? Math.log(x / M) / S : (Math.pow(x / M, L) - 1) / (L * S)
}

/** Fonction de répartition de la loi normale (approximation d'Abramowitz-Stegun, erreur < 1e-7). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp((-z * z) / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z > 0 ? 1 - p : p
}

/** Lignes standard des courbes OMS : 3e, 15e, 50e, 85e, 97e percentiles. */
export const PERCENTILE_LINES = [
  { p: 3, z: -1.881 },
  { p: 15, z: -1.036 },
  { p: 50, z: 0 },
  { p: 85, z: 1.036 },
  { p: 97, z: 1.881 },
]

export function curve(key: GrowthKey, sex: Sex, z: number, maxDays = MAX_DAYS): { days: number; value: number }[] {
  const pts = []
  for (let d = 0; d <= maxDays; d += STEP) pts.push({ days: d, value: valueAtZ(lmsAt(key, sex, d)!, z) })
  return pts
}

export interface Assessment {
  z: number
  percentile: number
  median: number
}

/** Position d'une mesure (kg ou cm) sur la courbe OMS. */
export function assess(key: GrowthKey, sex: Sex, ageDays: number, value: number): Assessment | null {
  const lms = lmsAt(key, sex, ageDays)
  if (!lms || !(value > 0)) return null
  const z = zScore(value, lms)
  return { z, percentile: normalCdf(z) * 100, median: lms[1] }
}

export const ageInDays = (birth: string, on: string) => dayNumber(on) - dayNumber(birth)

export function formatPercentile(p: number): string {
  if (p < 1) return '< 1er percentile'
  if (p > 99) return '> 99e percentile'
  const r = Math.round(p)
  return r === 1 ? '1er percentile' : `${r}e percentile`
}
