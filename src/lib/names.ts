import { normName, originOf } from '@/content/nameOrigins'

/** [nom, sexe, naissances sur 10 ans, année du pic, tendance] — cf. scripts/build-names.py */
export type RawName = [string, 'f' | 'm' | 'x', number, number, number]

export interface NameCard {
  name: string
  sex: 'f' | 'm' | 'x'
  recent: number
  peak: number
  trend: number
  origin?: string
  custom?: boolean
}

export interface NameFilters {
  sex: 'all' | 'f' | 'm' | 'x'
  initial: string | null
  length: 'all' | 'short' | 'medium' | 'long'
  popularity: 'all' | 'rare' | 'classic' | 'top' | 'rising' | 'retro'
  origin: string | null
}

export const DEFAULT_FILTERS: NameFilters = { sex: 'all', initial: null, length: 'all', popularity: 'all', origin: null }

export const toCard = ([name, sex, recent, peak, trend]: RawName): NameCard => ({ name, sex, recent, peak, trend, origin: originOf(name) })

/** Nombre de lettres (sans tirets ni espaces). */
export const letters = (n: string) => n.replace(/[-\s']/g, '').length

export function matchesFilters(c: NameCard, f: NameFilters): boolean {
  if (f.sex !== 'all') {
    // "Fille" inclut les mixtes, "Garçon" aussi ; "Mixte" uniquement les mixtes
    if (f.sex === 'x' ? c.sex !== 'x' : c.sex !== f.sex && c.sex !== 'x') return false
  }
  if (f.initial && normName(c.name)[0] !== f.initial.toLowerCase()) return false
  const len = letters(c.name)
  if (f.length === 'short' && len > 4) return false
  if (f.length === 'medium' && (len < 5 || len > 7)) return false
  if (f.length === 'long' && len < 8) return false
  if (f.origin && c.origin !== f.origin) return false
  if (!c.custom) {
    if (f.popularity === 'rare' && c.recent >= 1000) return false
    if (f.popularity === 'classic' && (c.recent < 1000 || c.recent > 15000)) return false
    if (f.popularity === 'top' && c.recent <= 15000) return false
    if (f.popularity === 'rising' && c.trend < 1.3) return false
    if (f.popularity === 'retro' && c.peak >= 1960) return false
  }
  return true
}

/** Générateur pseudo-aléatoire déterministe (même ordre à chaque ouverture). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Ordre du paquet : tirage pondéré par la popularité (les prénoms courants
 * sortent plus souvent en premier, mais les raretés apparaissent aussi),
 * stable pour un membre donné. Les prénoms ajoutés à la main passent devant.
 */
export function buildDeck(cards: NameCard[], voted: Set<string>, seed: string): NameCard[] {
  const rand = mulberry32(hashString(seed))
  const pool = cards.filter((c) => !voted.has(normName(c.name)))
  const keyed = pool.map((c) => {
    // Poids ∝ popularité^0.6 : les prénoms courants sortent plus tôt, les raretés restent présentes
    const w = c.custom ? 1e9 : Math.pow(c.recent + 10, 0.6)
    return { c, k: Math.pow(rand(), 1 / w) }
  })
  return keyed.sort((a, b) => b.k - a.k).map((x) => x.c)
}

export function popularityLabel(c: NameCard): string {
  if (c.custom) return 'Ajouté par vous ✍️'
  const perYear = Math.round(c.recent / 10)
  if (perYear < 1) return 'Très rare'
  return `≈ ${perYear.toLocaleString('fr-FR')} bébé${perYear > 1 ? 's' : ''} par an`
}

export function trendLabel(c: NameCard): string | null {
  if (c.custom) return null
  if (c.peak < 1960) return `🕰️ Rétro chic (pic en ${c.peak})`
  if (c.trend >= 1.3) return '📈 En vogue'
  if (c.trend <= 0.7) return '📉 Se fait plus rare'
  return '➡️ Stable'
}

export const SEX_LABEL = { f: 'Fille', m: 'Garçon', x: 'Mixte' } as const
