import { describe, expect, it } from 'vitest'
import { balanceMessage, daySummary, formatDuration, isNightTime, lastBottleMl, nextSide, nights, running, shareStats, timeAgo, type BabyEvent } from '../src/lib/baby'

// Dates locales (le test tourne dans le fuseau de la machine : on construit en local)
const at = (d: number, h: number, m = 0) => new Date(2027, 4, d, h, m).toISOString()
let n = 0
const ev = (kind: BabyEvent['kind'], start: string, end: string | null, data: BabyEvent['data'] = {}, by = 'q'): BabyEvent => ({ id: String(n++), kind, started_at: start, ended_at: end, data, created_by: by })

const events: BabyEvent[] = [
  ev('feed', at(10, 8), null, { mode: 'bottle', ml: 90 }),
  ev('feed', at(10, 11), at(10, 11, 20), { mode: 'breast', side: 'L' }, 'a'),
  ev('feed', at(10, 14), null, { mode: 'bottle', ml: 120 }, 'a'),
  ev('diaper', at(10, 8, 30), null, { pee: true, poo: false }),
  ev('diaper', at(10, 12), null, { pee: true, poo: true }, 'a'),
  ev('sleep', at(9, 22), at(10, 2)), // à cheval sur minuit : 2 h comptent le 10
  ev('sleep', at(10, 3), at(10, 6, 30), {}, 'a'),
  ev('med', at(10, 9), null, { name: 'Vitamine D' }),
  ev('diaper', at(11, 1), null, { pee: true, poo: false }), // autre jour
]

describe('résumé de la journée', () => {
  const s = daySummary(events, new Date(2027, 4, 10), new Date(2027, 4, 10, 20))
  it('repas', () => {
    expect(s.feeds).toBe(3)
    expect(s.bottleMl).toBe(210)
    expect(s.breastMinutes).toBe(20)
  })
  it('couches', () => {
    expect(s.diapers).toBe(2)
    expect(s.pees).toBe(2)
    expect(s.poos).toBe(1)
  })
  it('sommeil découpé à minuit', () => expect(s.sleepMinutes).toBe(120 + 210))
  it('médicaments', () => expect(s.meds).toBe(1))
  it('ignore les éléments supprimés', () => {
    const del = [...events, { ...ev('feed', at(10, 15), null, { mode: 'bottle', ml: 500 }), deleted_at: at(10, 16) }]
    expect(daySummary(del, new Date(2027, 4, 10)).bottleMl).toBe(210)
  })
})

describe('raccourcis intelligents', () => {
  it('prochain côté = l’autre côté', () => expect(nextSide(events)).toBe('R'))
  it('dernier biberon', () => expect(lastBottleMl(events)).toBe(120))
  it('aucun biberon : valeur par défaut', () => expect(lastBottleMl([])).toBe(90))
  it('chrono en cours', () => {
    const list = [...events, ev('sleep', at(10, 21), null)]
    expect(running(list, 'sleep')?.started_at).toBe(at(10, 21))
    expect(running(events, 'sleep')).toBeUndefined()
    expect(running(events, 'feed')).toBeUndefined() // les biberons n'ont pas de chrono
  })
})

describe('nuits (19 h → 7 h)', () => {
  it('segments et réveils de la nuit du 9 au 10', () => {
    const [night] = nights(events, 1, new Date(2027, 4, 10, 12))
    expect(night.date.getDate()).toBe(9)
    expect(night.segments).toEqual([
      { from: 180, to: 420 }, // 22 h → 2 h
      { from: 480, to: 690 }, // 3 h → 6 h 30
    ])
    expect(night.sleepMinutes).toBe(450)
    expect(night.wakeUps).toBe(1)
  })
  it('renvoie le nombre de nuits demandé, de la plus ancienne à la plus récente', () => {
    const list = nights(events, 3, new Date(2027, 4, 10, 23))
    expect(list.map((x) => x.date.getDate())).toEqual([8, 9, 10])
  })
})

describe('qui fait quoi', () => {
  const stats = shareStats(events, ['q', 'a'], new Date(2027, 4, 1))
  const q = stats.find((s) => s.memberId === 'q')!
  const a = stats.find((s) => s.memberId === 'a')!
  it('compte les soins par personne (hors sommeil)', () => {
    expect(q.total).toBe(4) // biberon, couche, vitamine, couche de 1 h
    expect(a.total).toBe(3)
  })
  it('actions de nuit (22 h → 6 h)', () => {
    expect(q.nightActions).toBe(2) // coucher 22 h + couche 1 h
    expect(a.nightActions).toBe(1) // coucher 3 h
    expect(isNightTime(at(10, 6))).toBe(false)
  })
  it('message bienveillant', () => {
    expect(balanceMessage(stats, { q: 'Quentin', a: 'Aude' })).toMatch(/bien partagée/)
    expect(balanceMessage(shareStats([], ['q'], new Date(0)), {})).toMatch(/pas encore/i)
  })
})

describe('formats', () => {
  it('durées', () => {
    expect(formatDuration(0)).toBe('moins d’1 min')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(125)).toBe('2 h 05')
    expect(formatDuration(120)).toBe('2 h')
  })
  it('il y a…', () => expect(timeAgo(at(10, 8), new Date(2027, 4, 10, 10, 30))).toBe('il y a 2 h 30'))
})
