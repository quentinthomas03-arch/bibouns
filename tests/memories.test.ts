import { describe, expect, it } from 'vitest'
import { groupByMonth, lifeMonth, monthCardTitle } from '../src/lib/memories'
import { FIRSTS } from '../src/content/memories'

describe('souvenirs mois par mois', () => {
  it('mois de vie', () => {
    expect(lifeMonth('2027-05-04', '2027-05-04')).toBe(0)
    expect(lifeMonth('2027-05-04', '2027-06-03')).toBe(0)
    expect(lifeMonth('2027-05-04', '2027-06-04')).toBe(1)
    expect(lifeMonth('2027-05-04', '2028-05-04')).toBe(12)
    expect(lifeMonth('2027-05-04', '2027-04-20')).toBe(-1)
  })
  it('fin de mois (né le 31 janvier)', () => {
    expect(lifeMonth('2027-01-31', '2027-02-27')).toBe(0)
    expect(lifeMonth('2027-01-31', '2027-02-28')).toBe(1)
  })
  it('groupes triés du plus récent au plus ancien', () => {
    const g = groupByMonth(
      [
        { memory_date: '2027-04-01', id: 'a' },
        { memory_date: '2027-05-10', id: 'b' },
        { memory_date: '2027-06-10', id: 'c' },
        { memory_date: '2027-05-20', id: 'd' },
      ],
      '2027-05-04',
    )
    expect(g.map((x) => x.label)).toEqual(['2e mois', 'Le 1er mois', 'Pendant la grossesse'])
    expect(g[1].items.map((x) => x.id)).toEqual(['d', 'b'])
  })
  it('sans naissance : mois calendaires', () => {
    const g = groupByMonth([{ memory_date: '2026-11-09' }], null)
    expect(g[0].label).toBe('novembre 2026')
    expect(g[0].lifeMonth).toBeNull()
  })
  it('titres des cartes', () => {
    expect(monthCardTitle(0)).toBe('1 mois')
    expect(monthCardTitle(5)).toBe('6 mois')
    expect(monthCardTitle(11)).toBe('1 an')
    expect(monthCardTitle(23)).toBe('2 ans')
  })
  it('premières fois : clés uniques', () => {
    expect(new Set(FIRSTS.map((f) => f.key)).size).toBe(FIRSTS.length)
  })
})
