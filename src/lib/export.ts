/**
 * Export des données (fonctions pures, testées) :
 *  - CSV lisibles dans Excel/Numbers (séparateur « ; », BOM UTF-8, dates françaises)
 *  - noms de fichiers photo rangés par mois : photos/2027-05_mai/2027-05-20_premier-sourire_1.jpg
 */

export interface Column<T> {
  label: string
  get: (row: T) => string | number | boolean | null | undefined
}

const BOM = '﻿'

function cell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'boolean' ? (v ? 'oui' : 'non') : typeof v === 'number' ? String(v).replace('.', ',') : String(v)
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv<T>(rows: T[], columns: Column<T>[]): string {
  const lines = [columns.map((c) => cell(c.label)).join(';'), ...rows.map((r) => columns.map((c) => cell(c.get(r))).join(';'))]
  return BOM + lines.join('\r\n') + '\r\n'
}

export const frDate = (iso?: string | null) => (iso ? new Date(iso.length <= 10 ? iso + 'T12:00' : iso).toLocaleDateString('fr-FR') : '')
export const frTime = (iso?: string | null) => (iso && iso.length > 10 ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '')

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']

export function monthFolder(date: string): string {
  const [y, m] = date.slice(0, 10).split('-')
  return `${y}-${m}_${MONTHS[Number(m) - 1]}`
}

/** Nom unique et lisible pour la n-ième photo d'un souvenir / document. */
export function photoFileName(root: string, date: string, title: string | null | undefined, index: number, used: Set<string>): string {
  const base = `${root}/${monthFolder(date)}/${date.slice(0, 10)}_${slugify(title || 'photo') || 'photo'}`
  let name = `${base}_${index + 1}.jpg`
  let k = 2
  while (used.has(name)) name = `${base}_${index + 1}-${k++}.jpg`
  used.add(name)
  return name
}

/** Découpe une liste en lots (photos réparties en plusieurs ZIP pour ménager la mémoire de l'iPhone). */
export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}
