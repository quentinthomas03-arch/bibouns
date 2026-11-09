import { describe, expect, it } from 'vitest'
import { brownNoise } from '../src/lib/noise'

describe('bruit doux', () => {
  it('normalisé dans [-1, 1] et sans valeur aberrante', () => {
    const d = brownNoise(48_000)
    let max = 0
    for (const v of d) {
      expect(Number.isFinite(v)).toBe(true)
      max = Math.max(max, Math.abs(v))
    }
    expect(max).toBeCloseTo(1, 5)
  })
  it('surtout grave : les échantillons voisins se ressemblent (contrairement au bruit blanc)', () => {
    const d = brownNoise(48_000)
    let diff = 0
    for (let i = 1; i < d.length; i++) diff += Math.abs(d[i] - d[i - 1])
    expect(diff / d.length).toBeLessThan(0.05)
  })
})
