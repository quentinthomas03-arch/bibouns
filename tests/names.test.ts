import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS, buildDeck, matchesFilters, toCard, type NameCard } from '../src/lib/names'
import { compatibility, syllables } from '../src/lib/compat'
import { originOf } from '../src/content/nameOrigins'
import data from '../src/content/names.json'

const cards: NameCard[] = [
  toCard(['Louise', 'f', 30000, 2018, 1.0]),
  toCard(['Jules', 'm', 39000, 2015, 0.8]),
  toCard(['Camille', 'x', 30000, 1998, 0.5]),
  toCard(['Marcel', 'm', 4000, 1920, 2.0]),
  toCard(['Ysée', 'f', 300, 2020, 1.6]),
]

describe('données INSEE', () => {
  it('fichier chargé et cohérent', () => {
    expect(data.names.length).toBeGreaterThan(3000)
    expect(data.meta.source).toMatch(/INSEE/)
    const gab = data.names.find((n) => n[0] === 'Gabriel')!
    expect(gab[1]).toBe('m')
  })
  it('origines connues', () => {
    expect(originOf('Aude')).toBe('Germanique')
    expect(originOf('quentin')).toBe('Latine')
    expect(originOf('Zzz')).toBeUndefined()
  })
})

describe('filtres', () => {
  const f = (o: Partial<typeof DEFAULT_FILTERS>) => cards.filter((c) => matchesFilters(c, { ...DEFAULT_FILTERS, ...o })).map((c) => c.name)
  it('genre : fille inclut les mixtes', () => expect(f({ sex: 'f' })).toEqual(['Louise', 'Camille', 'Ysée']))
  it('mixte seulement', () => expect(f({ sex: 'x' })).toEqual(['Camille']))
  it('initiale sans accent', () => expect(f({ initial: 'Y' })).toEqual(['Ysée']))
  it('longueur', () => {
    expect(f({ length: 'short' })).toEqual(['Ysée'])
    expect(f({ length: 'medium' })).toEqual(['Louise', 'Jules', 'Camille', 'Marcel'])
  })
  it('popularité', () => {
    expect(f({ popularity: 'retro' })).toEqual(['Marcel'])
    expect(f({ popularity: 'rare' })).toEqual(['Ysée'])
    expect(f({ popularity: 'rising' })).toEqual(['Marcel', 'Ysée'])
  })
})

describe('paquet de cartes', () => {
  it('exclut les prénoms déjà votés (sans tenir compte des accents)', () => {
    const deck = buildDeck(cards, new Set(['ysee', 'jules']), 'membre-1')
    expect(deck.map((c) => c.name).sort()).toEqual(['Camille', 'Louise', 'Marcel'])
  })
  it('ordre stable pour un même membre, différent pour l’autre', () => {
    const big = data.names.slice(0, 200).map((n) => toCard(n as never))
    const a1 = buildDeck(big, new Set(), 'quentin').map((c) => c.name)
    const a2 = buildDeck(big, new Set(), 'quentin').map((c) => c.name)
    const b = buildDeck(big, new Set(), 'aude').map((c) => c.name)
    expect(a1).toEqual(a2)
    expect(a1).not.toEqual(b)
  })
  it('les prénoms ajoutés à la main passent en premier', () => {
    const deck = buildDeck([...cards, { name: 'Biboune', sex: 'f', recent: 0, peak: 0, trend: 0, custom: true }], new Set(), 's')
    expect(deck[0].name).toBe('Biboune')
  })
})

describe('compatibilité', () => {
  it('syllabes approximatives', () => {
    expect(syllables('Louise')).toBe(2)
    expect(syllables('Jules')).toBe(1)
    expect(syllables('Gabriel')).toBe(3)
    expect(syllables('Thomas')).toBe(2)
  })
  it('score borné et déterministe', () => {
    const a = compatibility('Louise', 'Thomas')
    expect(a).toEqual(compatibility('Louise', 'Thomas'))
    expect(a.score).toBeGreaterThanOrEqual(45)
    expect(a.score).toBeLessThanOrEqual(99)
    expect(a.initials).toBe('LT')
  })
  it('repère les initiales gênantes', () => {
    const r = compatibility('Paul', 'Quentel')
    expect(r.notes.some((n) => n.includes('P.Q.'))).toBe(true)
  })
  it('repère le hiatus voyelle-voyelle', () => {
    expect(compatibility('Léa', 'Arnaud').notes.some((n) => n.includes('hiatus'))).toBe(true)
  })
  it('allitération', () => {
    expect(compatibility('Théo', 'Thomas').notes.some((n) => n.includes('Allitération'))).toBe(true)
  })
})
