import { describe, expect, it } from 'vitest'
import { contractionStats, formatSec, type Contraction } from '../src/lib/contractions'

const base = new Date(2027, 4, 3, 20, 0).getTime()
/** génère des contractions toutes les `every` min pendant `total` min, durée `dur` s */
function series(every: number, total: number, dur = 60, start = base): Contraction[] {
  const out: Contraction[] = []
  for (let m = 0; m <= total; m += every) {
    const s = start + m * 60_000
    out.push({ started_at: new Date(s).toISOString(), ended_at: new Date(s + dur * 1000).toISOString() })
  }
  return out
}
const at = (min: number) => new Date(base + min * 60_000)

describe('chrono des contractions', () => {
  it('rien ou une seule contraction : pas de repère', () => {
    expect(contractionStats([], at(0)).state).toBe('none')
    expect(contractionStats(series(5, 0), at(1)).state).toBe('none')
  })
  it('toutes les 10 min : début de travail', () => {
    const s = contractionStats(series(10, 120), at(121))
    expect(s.avgIntervalMin).toBe(10)
    expect(s.state).toBe('early')
  })
  it('toutes les 5 min depuis 45 min : on s’en rapproche', () => {
    const s = contractionStats(series(5, 45), at(46))
    expect(s.avgIntervalMin).toBe(5)
    expect(s.regular).toBe(true)
    expect(s.avgDurationSec).toBe(60)
    expect(s.state).toBe('close')
  })
  it('toutes les 5 min depuis 2 h : repère atteint', () => {
    const s = contractionStats(series(5, 120), at(121))
    expect(s.sustainedMin).toBeGreaterThanOrEqual(120)
    expect(s.state).toBe('reached')
  })
  it('une pause de 20 min casse le rythme', () => {
    const list = [...series(5, 60), ...series(5, 60, 60, base + 80 * 60_000)]
    const s = contractionStats(list, at(141))
    expect(s.sustainedMin).toBeLessThan(70)
    expect(s.state).not.toBe('reached')
  })
  it('rythme irrégulier : pas "atteint" même long', () => {
    const list: Contraction[] = []
    let m = 0
    const gaps = [2, 6, 3, 6, 2, 6, 3, 5]
    for (let i = 0; m <= 130; i++) {
      list.push({ started_at: at(m).toISOString(), ended_at: new Date(at(m).getTime() + 50_000).toISOString() })
      m += gaps[i % gaps.length]
    }
    const s = contractionStats(list, at(131))
    expect(s.regular).toBe(false)
    expect(s.state).not.toBe('reached')
  })
  it('contractions arrêtées depuis longtemps : rythme rompu', () => {
    expect(contractionStats(series(5, 120), at(200)).sustainedMin).toBe(0)
  })
  it('format', () => {
    expect(formatSec(45)).toBe('45 s')
    expect(formatSec(75)).toBe('1 min 15')
  })
})
