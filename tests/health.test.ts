import { describe, expect, it } from 'vitest'
import { addMonthsISO, examSchedule, rsvDate, vaccineSchedule } from '../src/lib/health'
import { VACCINES } from '../src/content/health'

describe('dates du carnet de santé', () => {
  it('ajout de mois calendaires', () => {
    expect(addMonthsISO('2027-05-04', 2)).toBe('2027-07-04')
    expect(addMonthsISO('2027-01-31', 1)).toBe('2027-02-28')
    expect(addMonthsISO('2027-05-04', 12)).toBe('2028-05-04')
  })
  it('calendrier vaccinal personnalisé', () => {
    const s = vaccineSchedule('2027-05-04', [{ code: 'hexa-1', done_on: '2027-07-05' }], '2027-08-01')
    const by = (c: string) => s.find((x) => x.code === c)!
    expect(by('hexa-1').status).toBe('done')
    expect(by('pneumo-1').due).toBe('2027-07-04')
    expect(by('pneumo-1').status).toBe('due') // 28 jours de retard : encore dans la fenêtre
    expect(by('menb-1').due).toBe('2027-08-04')
    expect(by('menb-1').status).toBe('due')
    expect(by('ror-2').status).toBe('later')
  })
  it('retard au-delà de 30 jours', () => {
    const s = vaccineSchedule('2027-05-04', [], '2027-09-01')
    expect(s.find((x) => x.code === 'hexa-1')!.status).toBe('late')
  })
  it('obligations 2025 présentes (méningocoques B et ACWY)', () => {
    const codes = VACCINES.map((v) => v.code)
    for (const c of ['menb-1', 'menb-2', 'menb-r', 'menacwy-1', 'menacwy-r']) expect(codes).toContain(c)
    expect(VACCINES.filter((v) => v.code.startsWith('rota')).every((v) => !v.mandatory)).toBe(true)
  })
  it('VRS : naissance en mai → début de campagne en septembre', () => {
    expect(rsvDate('2027-05-04')).toEqual({ date: '2027-09-15', atBirth: false })
    expect(rsvDate('2027-11-20')).toEqual({ date: '2027-11-20', atBirth: true })
    expect(rsvDate('2028-02-10').atBirth).toBe(true)
    expect(rsvDate('2027-09-10').atBirth).toBe(false)
  })
  it('examens : 8 jours, 9 et 24 mois avec certificat', () => {
    const e = examSchedule('2027-05-04')
    expect(e[0]).toMatchObject({ start: '2027-05-04', end: '2027-05-12', certificate: true })
    expect(e.filter((x) => x.certificate).map((x) => x.start)).toEqual(['2027-05-04', '2028-02-04', '2029-05-04'])
  })
})
