import { describe, expect, it } from 'vitest'
import { computeReminders, parisParts, type ReminderInput } from '../supabase/functions/_shared/reminders'
import { VACCINE_DOSES } from '../supabase/functions/_shared/vaccines'
import { VACCINES } from '../src/content/health'
import { onDuty } from '../supabase/functions/_shared/reminders'
import { whoOnNight } from '../src/lib/nightshift'

const base = (now: string, over: Partial<ReminderInput> = {}): ReminderInput => ({
  now: new Date(now),
  members: [{ id: 'q', first_name: 'Quentin' }, { id: 'a', first_name: 'Aude' }],
  appointments: [],
  checklistItems: [],
  baby: null,
  vaccineDoses: VACCINE_DOSES,
  vaccinesDone: [],
  ...over,
})

describe('rappels push', () => {
  it('heure de Paris (été / hiver)', () => {
    expect(parisParts(new Date('2027-07-01T07:30:00Z'))).toEqual({ date: '2027-07-01', hour: 9 })
    expect(parisParts(new Date('2027-01-15T08:10:00Z'))).toEqual({ date: '2027-01-15', hour: 9 })
    expect(parisParts(new Date('2027-01-15T23:30:00Z'))).toEqual({ date: '2027-01-16', hour: 0 })
  })

  it('rendez-vous : la veille, dans la fenêtre de 15 min', () => {
    const appt = { id: 'r1', title: '2e écho', starts_at: '2026-12-08T13:30:00Z', location: 'Cabinet', remind_minutes: [1440], subject: 'pregnancy' }
    expect(computeReminders(base('2026-12-07T13:29:00Z', { appointments: [appt] }))).toHaveLength(0)
    const r = computeReminders(base('2026-12-07T13:33:00Z', { appointments: [appt] }))
    expect(r).toHaveLength(1)
    expect(r[0].title).toBe('📅 2e écho demain')
    expect(r[0].body).toContain('14:30') // heure de Paris
    expect(r[0].memberIds).toEqual(['q', 'a'])
    expect(computeReminders(base('2026-12-07T13:50:00Z', { appointments: [appt] }))).toHaveLength(0)
  })

  it('pas de rappel pour un RDV fait ou passé', () => {
    const appt = { id: 'r1', title: 'x', starts_at: '2026-12-08T13:30:00Z', remind_minutes: [120], subject: 'pregnancy', done: true }
    expect(computeReminders(base('2026-12-08T11:31:00Z', { appointments: [appt] }))).toHaveLength(0)
  })

  it('vaccins : J-7 et le jour J, à 9 h, groupés par date', () => {
    const baby = { first_name: 'Louise', born_at: '2027-05-04T01:12:00Z' }
    // 2 mois = 4 juillet ; J-7 = 27 juin, 9 h Paris = 7 h UTC
    const r = computeReminders(base('2027-06-27T07:05:00Z', { baby }))
    expect(r).toHaveLength(1)
    expect(r[0].title).toBe('💉 Vaccins de Louise dans 7 jours')
    expect(r[0].body).toContain('Pneumocoque')
    expect(computeReminders(base('2027-06-27T10:05:00Z', { baby }))).toHaveLength(0) // pas à 12 h
    const done = computeReminders(base('2027-07-04T07:05:00Z', { baby, vaccinesDone: ['hexa-1', 'pneumo-1', 'rota-1'] }))
    expect(done).toHaveLength(0)
  })

  it('échéances de liste : au responsable, sinon aux deux', () => {
    const items = [
      { id: 'i1', label: 'Déclarer la naissance', due_date: '2027-05-09', done: false, assignee: 'q' },
      { id: 'i2', label: 'Mutuelle', due_date: '2027-05-06', done: false },
      { id: 'i3', label: 'Fait', due_date: '2027-05-06', done: true },
    ]
    const r = computeReminders(base('2027-05-06T07:10:00Z', { checklistItems: items }))
    expect(r.map((x) => [x.key, x.memberIds])).toEqual([
      ['item:i1:2027-05-09:3', ['q']],
      ['item:i2:2027-05-06:0', ['q', 'a']],
    ])
  })

  it('rappel de sauvegarde le 1er du mois à 9 h', () => {
    const r = computeReminders(base('2027-06-01T07:20:00Z'))
    expect(r.map((x) => x.key)).toEqual(['backup:2027-06'])
    expect(computeReminders(base('2027-06-02T07:20:00Z'))).toHaveLength(0)
  })

  it('tour de garde : notification à 21 h (Paris) au parent de garde et à l’autre', () => {
    const baby = { first_name: 'Louise', born_at: '2027-05-04T01:12:00Z' }
    const nightShift = { enabled: true, startMember: 'a', startDate: '2027-05-10', overrides: {} }
    const r = computeReminders(base('2027-05-11T19:05:00Z', { baby, nightShift })) // 21 h 05 à Paris (été)
    expect(r.map((x) => [x.key, x.memberIds])).toEqual([
      ['night:2027-05-11:duty', ['q']],
      ['night:2027-05-11:rest', ['a']],
    ])
    expect(computeReminders(base('2027-05-11T19:05:00Z', { baby, nightShift: { ...nightShift, enabled: false } }))).toHaveLength(0)
  })

  it('la règle du tour de garde est identique côté serveur et côté appli', () => {
    const cfg = { enabled: true, startMember: 'a', startDate: '2027-05-10', overrides: { '2027-05-14': 'a' } }
    for (let d = 1; d <= 28; d++) {
      const date = `2027-05-${String(d).padStart(2, '0')}`
      expect(onDuty(cfg, ['q', 'a'], date)).toBe(whoOnNight(cfg, ['q', 'a'], date))
    }
  })

  it('le calendrier vaccinal du serveur est identique à celui de l’appli', () => {
    expect(VACCINE_DOSES.map((v) => [v.code, v.months])).toEqual(VACCINES.map((v) => [v.code, v.months]))
  })
})
