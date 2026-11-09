import { describe, expect, it } from 'vitest'
import { babyAge, formatBabyAge, formatSA, lmpFromDueDate, pregnancyProgress } from '../src/lib/pregnancy'
import { currentPhase } from '../src/lib/phase'

const DPA = '2027-05-04'

describe('grossesse (convention française, DPA = DDR + 287 j)', () => {
  it('retrouve la DDR', () => {
    expect(lmpFromDueDate(DPA)).toBe('2026-07-21')
  })
  it('41 SA pile le jour de la DPA', () => {
    const p = pregnancyProgress(DPA, '2027-05-04')
    expect(p.weeks).toBe(41)
    expect(p.days).toBe(0)
    expect(p.daysLeft).toBe(0)
    expect(p.month).toBe(9)
    expect(p.progress).toBe(1)
  })
  it("calcule SA + jours aujourd'hui (9 nov. 2026)", () => {
    const p = pregnancyProgress(DPA, '2026-11-09')
    // 21 juillet -> 9 nov = 111 jours = 15 SA + 6 j
    expect(p.daysSinceLmp).toBe(111)
    expect(formatSA(p)).toBe('15 SA + 6 j')
    expect(p.currentWeek).toBe(16)
    expect(p.daysLeft).toBe(176)
    expect(p.trimester).toBe(2)
    expect(p.month).toBe(4)
  })
  it('ignore les changements d’heure (passage à l’heure d’été le 28 mars 2027)', () => {
    expect(pregnancyProgress(DPA, '2027-03-27').daysLeft - pregnancyProgress(DPA, '2027-03-29').daysLeft).toBe(2)
  })
  it('accepte un objet Date local', () => {
    expect(pregnancyProgress(DPA, new Date(2027, 4, 3, 23, 59)).daysLeft).toBe(1)
  })
  it('mois de grossesse bornés 1..9', () => {
    expect(pregnancyProgress(DPA, '2026-07-25').month).toBe(1)
    expect(pregnancyProgress(DPA, '2027-05-20').month).toBe(9)
  })
  it('terme dépassé : jours négatifs', () => {
    expect(pregnancyProgress(DPA, '2027-05-07').daysLeft).toBe(-3)
  })
})

describe('âge du bébé', () => {
  it('jours et semaines', () => {
    expect(babyAge('2027-05-04', '2027-05-04').days).toBe(0)
    expect(formatBabyAge(babyAge('2027-05-04', '2027-05-05'))).toBe('1 jour')
    expect(formatBabyAge(babyAge('2027-05-04', '2027-05-14'))).toBe('10 jours')
    expect(formatBabyAge(babyAge('2027-05-04', '2027-05-22'))).toBe('2 semaines et 4 j')
  })
  it('mois calendaires', () => {
    expect(babyAge('2027-05-04', '2027-07-03').months).toBe(1)
    expect(babyAge('2027-05-04', '2027-07-04').months).toBe(2)
    expect(formatBabyAge(babyAge('2027-05-04', '2027-08-10'))).toBe('3 mois et 6 j')
  })
  it('fin de mois (31 janvier + 1 mois)', () => {
    expect(babyAge('2027-01-31', '2027-02-28').months).toBe(0)
    expect(babyAge('2027-01-31', '2027-03-01').months).toBe(1)
  })
  it('années', () => {
    expect(formatBabyAge(babyAge('2027-05-04', '2029-06-04'))).toBe('2 ans et 1 mois')
  })
})

describe('phase de l’appli', () => {
  const base = { dueDate: DPA, bornAt: null, laborStarted: false, manual: null }
  it('avant la DPA', () => expect(currentPhase({ ...base, today: new Date(2026, 10, 9) })).toBe('before'))
  it('Jour J au terme', () => expect(currentPhase({ ...base, today: new Date(2027, 4, 4) })).toBe('dday'))
  it('Jour J si "Ça y est"', () => expect(currentPhase({ ...base, laborStarted: true, today: new Date(2027, 3, 20) })).toBe('dday'))
  it('après la naissance', () => expect(currentPhase({ ...base, bornAt: '2027-04-30T03:12:00Z', laborStarted: true })).toBe('after'))
  it('bascule manuelle prioritaire', () => expect(currentPhase({ ...base, bornAt: '2027-04-30', manual: 'before' })).toBe('before'))
  it('sans date prévue', () => expect(currentPhase({ ...base, dueDate: null })).toBe('before'))
})
