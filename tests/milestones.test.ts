import { describe, expect, it } from 'vitest'
import { datedMilestones } from '../src/lib/milestones'
import { MILESTONES } from '../src/content/milestones'
import { WEEKS, tipsFor, weekInfo } from '../src/content/weeks'

describe('échéances datées', () => {
  const list = datedMilestones('2027-05-04', null, '2026-11-09')
  const by = (id: string) => list.find((m) => m.id === id)!

  it('2e écho : 20-25 SA', () => {
    // DDR = 21/07/2026 ; 20 SA = 08/12/2026 ; 25 SA + 6 j = 18/01/2027
    expect(by('echo2').start).toBe('2026-12-08')
    expect(by('echo2').end).toBe('2027-01-18')
    expect(by('echo2').status).toBe('soon')
  })
  it('déclaration de grossesse déjà passée au 9 nov', () => {
    expect(by('declaration').status).toBe('past')
  })
  it('congé maternité 6 semaines avant la DPA', () => {
    expect(by('conge-mat').start).toBe('2027-03-23')
  })
  it('déclaration de naissance : 5 jours après la naissance réelle', () => {
    const after = datedMilestones('2027-05-04', '2027-04-28T03:00:00Z', '2027-04-29')
    const d = after.find((m) => m.id === 'decl-naissance')!
    expect(d.start).toBe('2027-04-28')
    expect(d.end).toBe('2027-05-03')
    expect(d.status).toBe('now')
  })
  it('liste triée par date et ids uniques', () => {
    expect(list.map((m) => m.start)).toEqual([...list.map((m) => m.start)].sort())
    expect(new Set(MILESTONES.map((m) => m.id)).size).toBe(MILESTONES.length)
  })
})

describe('contenu semaine par semaine', () => {
  it('chaque semaine de 4 à 41 SA a un fruit, des tailles croissantes', () => {
    let prevCm = 0
    for (let w = 4; w <= 41; w++) {
      const info = WEEKS[w]
      expect(info, `semaine ${w}`).toBeDefined()
      expect(info.cm).toBeGreaterThanOrEqual(prevCm)
      prevCm = info.cm
    }
  })
  it('au-delà du terme on garde la dernière semaine', () => {
    expect(weekInfo(43)?.fruit).toBe(WEEKS[41].fruit)
    expect(weekInfo(2)).toBeNull()
  })
  it('un conseil maman/papa pour chaque semaine', () => {
    for (let w = 0; w <= 42; w++) expect(tipsFor(w), `semaine ${w}`).not.toBeNull()
  })
})
