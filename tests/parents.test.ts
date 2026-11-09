import { describe, expect, it } from 'vitest'
import { needsSupport } from '../src/lib/parents'

const e = (d: string, mood: number, by = 'a') => ({ entry_date: d, mood, created_by: by })

describe('carte d’aide (suivi des parents)', () => {
  it('quelques jours difficiles au début : pas d’alerte (baby blues)', () => {
    expect(needsSupport([e('2027-05-06', 1), e('2027-05-07', 2), e('2027-05-08', 2), e('2027-05-09', 2)], 'a', '2027-05-10')).toBe(false)
  })
  it('jours difficiles qui durent plus d’une semaine : carte affichée', () => {
    expect(needsSupport([e('2027-05-20', 2), e('2027-05-23', 1), e('2027-05-26', 2), e('2027-05-28', 2)], 'a', '2027-05-29')).toBe(true)
  })
  it('compte par personne et sur 14 jours seulement', () => {
    const list = [e('2027-05-20', 2, 'q'), e('2027-05-23', 1, 'q'), e('2027-05-26', 2), e('2027-05-28', 2)]
    expect(needsSupport(list, 'a', '2027-05-29')).toBe(false)
    expect(needsSupport([e('2027-04-01', 1), e('2027-04-03', 1), e('2027-04-05', 1), e('2027-04-08', 1)], 'a', '2027-05-29')).toBe(false)
  })
  it('plusieurs points le même jour comptent pour un jour', () => {
    expect(needsSupport([e('2027-05-20', 2), e('2027-05-20', 1), e('2027-05-20', 1), e('2027-05-28', 2)], 'a', '2027-05-29')).toBe(false)
  })
})
