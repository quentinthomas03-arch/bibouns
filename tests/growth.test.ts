import { describe, expect, it } from 'vitest'
import { assess, lmsAt, normalCdf, valueAtZ, ageInDays, formatPercentile } from '../src/lib/growth'

// Médianes publiées par l'OMS (Standards de croissance 2006)
describe('courbes OMS', () => {
  it('médianes à la naissance', () => {
    expect(lmsAt('weight', 'm', 0)![1]).toBeCloseTo(3.3464, 4)
    expect(lmsAt('weight', 'f', 0)![1]).toBeCloseTo(3.2322, 4)
    expect(lmsAt('length', 'f', 0)![1]).toBeCloseTo(49.1477, 3)
    expect(lmsAt('head', 'f', 0)![1]).toBeCloseTo(33.8787, 3)
  })
  it('médianes à 12 mois (365 j) proches des tables mensuelles OMS', () => {
    expect(lmsAt('weight', 'm', 365)![1]).toBeCloseTo(9.6, 1) // garçon 12 mois : 9,6 kg
    expect(lmsAt('weight', 'f', 365)![1]).toBeCloseTo(8.9, 1) // fille 12 mois : 8,9 kg
    expect(lmsAt('length', 'm', 365)![1]).toBeCloseTo(75.7, 0) // 75,7 cm
    expect(lmsAt('head', 'f', 365)![1]).toBeCloseTo(44.9, 0) // ~44,9 cm
  })
  it('médianes à 24 mois (garde-fou contre un décalage des tables)', () => {
    expect(lmsAt('weight', 'm', 728)![1]).toBeCloseTo(12.15, 1) // OMS 24 mois : 12,2 kg
    expect(lmsAt('weight', 'f', 728)![1]).toBeCloseTo(11.48, 1) // OMS 24 mois : 11,5 kg
    expect(lmsAt('length', 'f', 728)![1]).toBeCloseTo(86.4, 0) // OMS 24 mois : 86,4 cm
  })
  it('3e et 97e percentiles du poids d’un garçon à la naissance (2,5 et 4,4 kg)', () => {
    const lms = lmsAt('weight', 'm', 0)!
    expect(valueAtZ(lms, -1.881)).toBeCloseTo(2.5, 1)
    expect(valueAtZ(lms, 1.881)).toBeCloseTo(4.4, 1)
  })
  it('z-score aller-retour et percentile', () => {
    const r = assess('weight', 'f', 100, valueAtZ(lmsAt('weight', 'f', 100)!, 1))!
    expect(r.z).toBeCloseTo(1, 6)
    expect(r.percentile).toBeCloseTo(84.13, 1)
    expect(normalCdf(0)).toBeCloseTo(0.5, 6)
  })
  it('hors limites', () => {
    expect(lmsAt('weight', 'm', -1)).toBeNull()
    expect(assess('weight', 'm', 800, 10)).toBeNull()
  })
  it('âge en jours et format', () => {
    expect(ageInDays('2027-05-04', '2027-06-03')).toBe(30)
    expect(formatPercentile(50.4)).toBe('50e percentile')
    expect(formatPercentile(0.5)).toBe('< 1er percentile')
  })
})
