import { describe, expect, it } from 'vitest'
import { BIRTHPLAN, birthPlanText } from '../src/content/birthplan'

describe('projet de naissance', () => {
  it('texte : seulement les sections remplies, notes incluses', () => {
    const t = birthPlanText({ choices: { douleur: ['Péridurale souhaitée'], naissance: [] }, notes: { ambiance: 'Playlist « Biboun »' }, general: 'Merci !' }, 'Quentin & Aude', '2027-05-04')
    expect(t).toContain('Date prévue : 4 mai 2027')
    expect(t).toContain('💆 Gestion de la douleur\n• Péridurale souhaitée')
    expect(t).toContain('🕯️ Ambiance\n• Playlist « Biboun »')
    expect(t).not.toContain('À la naissance')
    expect(t).toContain('💬 Un mot pour l’équipe\nMerci !')
  })
  it('sections uniques', () => expect(new Set(BIRTHPLAN.map((s) => s.key)).size).toBe(BIRTHPLAN.length))
})
