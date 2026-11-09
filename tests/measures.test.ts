import { describe, expect, it } from 'vitest'
import { parseBloodPressure, parseWeight } from '../src/lib/measures'

describe('saisie des mesures', () => {
  it('tension en notation française ou mmHg', () => {
    expect(parseBloodPressure('12/8')).toEqual({ sys: 120, dia: 80 })
    expect(parseBloodPressure('12,5 / 7,5')).toEqual({ sys: 125, dia: 75 })
    expect(parseBloodPressure('118/76')).toEqual({ sys: 118, dia: 76 })
  })
  it('tension invalide', () => {
    expect(parseBloodPressure('8/12')).toBeNull()
    expect(parseBloodPressure('abc')).toBeNull()
    expect(parseBloodPressure('400/80')).toBeNull()
  })
  it('poids', () => {
    expect(parseWeight('65,4')).toBe(65.4)
    expect(parseWeight('65.45')).toBe(65.5)
    expect(parseWeight('5')).toBeNull()
  })
})
