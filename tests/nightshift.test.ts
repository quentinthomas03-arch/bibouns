import { describe, expect, it } from 'vitest'
import { currentNightDate, whoOnNight, type NightShift } from '../src/lib/nightshift'

const cfg: NightShift = { enabled: true, startMember: 'a', startDate: '2027-05-10', overrides: {} }
const m = ['q', 'a']

describe('tour de garde des nuits', () => {
  it('alterne chaque nuit à partir de la date de départ', () => {
    expect(whoOnNight(cfg, m, '2027-05-10')).toBe('a')
    expect(whoOnNight(cfg, m, '2027-05-11')).toBe('q')
    expect(whoOnNight(cfg, m, '2027-05-12')).toBe('a')
    expect(whoOnNight(cfg, m, '2027-05-09')).toBe('q') // avant le départ aussi
  })
  it('un échange ponctuel ne décale pas la suite', () => {
    const c = { ...cfg, overrides: { '2027-05-12': 'q' } }
    expect(whoOnNight(c, m, '2027-05-12')).toBe('q')
    expect(whoOnNight(c, m, '2027-05-13')).toBe('q')
    expect(whoOnNight(c, m, '2027-05-14')).toBe('a')
  })
  it('désactivé ou seul : personne', () => {
    expect(whoOnNight({ ...cfg, enabled: false }, m, '2027-05-10')).toBeNull()
    expect(whoOnNight(cfg, ['q'], '2027-05-10')).toBeNull()
  })
  it('à 3 h du matin, on est encore dans la nuit de la veille', () => {
    expect(currentNightDate(new Date(2027, 4, 11, 3, 0))).toBe('2027-05-10')
    expect(currentNightDate(new Date(2027, 4, 11, 21, 0))).toBe('2027-05-11')
  })
})
