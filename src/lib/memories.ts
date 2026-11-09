import { dayNumber } from './pregnancy'

/**
 * Mois de vie à une date donnée (0 = 1er mois, de la naissance au "mois-anniversaire").
 * Les dates avant la naissance renvoient -1 (grossesse).
 */
export function lifeMonth(birth: string, date: string): number {
  const [by, bm, bd] = birth.slice(0, 10).split('-').map(Number)
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  if (dayNumber(date) < dayNumber(birth)) return -1
  let months = (y - by) * 12 + (m - bm)
  // jour du mois-anniversaire, borné à la fin du mois (31 janv. → 28 févr.)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  if (d < Math.min(bd, lastDay)) months--
  return Math.max(0, months)
}

export interface MonthGroup<T> {
  key: string
  /** -1 = grossesse ; sinon mois de vie ; null = mois calendaire (pas de date de naissance) */
  lifeMonth: number | null
  label: string
  items: T[]
}

/** Regroupe des souvenirs par mois de vie (ou par mois calendaire si bébé n'est pas né). */
export function groupByMonth<T extends { memory_date: string }>(items: T[], birth: string | null): MonthGroup<T>[] {
  const groups = new Map<string, MonthGroup<T>>()
  for (const it of items) {
    let key: string
    let lm: number | null = null
    let label: string
    if (birth) {
      lm = lifeMonth(birth, it.memory_date)
      key = `m${String(lm + 1).padStart(3, '0')}`
      label = lm < 0 ? 'Pendant la grossesse' : lm === 0 ? 'Le 1er mois' : `${lm + 1}e mois`
    } else {
      key = it.memory_date.slice(0, 7)
      label = new Date(it.memory_date.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    }
    if (!groups.has(key)) groups.set(key, { key, lifeMonth: lm, label, items: [] })
    groups.get(key)!.items.push(it)
  }
  for (const g of groups.values()) g.items.sort((a, b) => b.memory_date.localeCompare(a.memory_date))
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key))
}

/** Titre de la carte mensuelle : "1 mois", "6 mois", "1 an"… (âge atteint à la fin du mois de vie). */
export function monthCardTitle(lm: number): string {
  const age = lm + 1
  if (age % 12 === 0) return age === 12 ? '1 an' : `${age / 12} ans`
  return `${age} mois`
}
