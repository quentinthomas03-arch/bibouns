import { describe, expect, it } from 'vitest'
import { chunk, monthFolder, photoFileName, slugify, toCsv } from '../src/lib/export'

describe('export', () => {
  it('CSV pour Excel français : BOM, « ; », guillemets, décimales à virgule', () => {
    const csv = toCsv(
      [
        { a: 'Biberon; 120 ml', b: 3.5, c: true },
        { a: 'Dit "coucou"', b: null, c: false },
      ],
      [
        { label: 'Quoi', get: (r) => r.a },
        { label: 'Poids (kg)', get: (r) => r.b },
        { label: 'Fait', get: (r) => r.c },
      ],
    )
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.slice(1).split('\r\n')).toEqual(['Quoi;Poids (kg);Fait', '"Biberon; 120 ml";3,5;oui', '"Dit ""coucou""";;non', ''])
  })
  it('noms de dossiers et de fichiers lisibles, sans accents ni doublons', () => {
    expect(monthFolder('2027-08-14')).toBe('2027-08_aout')
    expect(slugify('Premier sourire 😊 à la crèche !')).toBe('premier-sourire-a-la-creche')
    const used = new Set<string>()
    expect(photoFileName('photos', '2027-05-20', 'Premier sourire', 0, used)).toBe('photos/2027-05_mai/2027-05-20_premier-sourire_1.jpg')
    expect(photoFileName('photos', '2027-05-20', 'Premier sourire', 0, used)).toBe('photos/2027-05_mai/2027-05-20_premier-sourire_1-2.jpg')
    expect(photoFileName('photos', '2027-05-20', null, 1, used)).toBe('photos/2027-05_mai/2027-05-20_photo_2.jpg')
  })
  it('découpage en lots', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 2)).toEqual([])
  })
})
