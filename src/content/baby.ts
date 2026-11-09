/**
 * Textes du suivi bébé (modifiables).
 * ⚕️ CONTENU SANTÉ : informatif uniquement, jamais de dose ni de diagnostic.
 */

export const BOTTLE_PRESETS = [30, 60, 90, 120, 150, 180, 210, 240]

export const DEFAULT_MEDS = ['Vitamine D']

export const DIAPER_COLORS = [
  { key: 'meconium', label: 'Noir/vert foncé (méconium)', swatch: '#2f2a1f' },
  { key: 'jaune', label: 'Jaune', swatch: '#e7c14a' },
  { key: 'moutarde', label: 'Moutarde', swatch: '#c79a2e' },
  { key: 'vert', label: 'Vert', swatch: '#7a8f3a' },
  { key: 'marron', label: 'Marron', swatch: '#7b4f2c' },
  { key: 'pale', label: 'Très pâle / blanc / gris', swatch: '#ece6d6' },
]

export const DIAPER_TEXTURES = ['Liquide', 'Molle', 'Grumeleuse', 'Pâteuse', 'Dure']

/** Repère de la carte de couleur des selles du carnet de santé. */
export const PALE_STOOL_ALERT =
  'Selles très pâles (blanches, grises ou jaune très clair) : c’est un signal à montrer rapidement à un médecin (repère de la carte de couleur des selles du carnet de santé).'

export const FEEDING_HINT =
  'Allaitement, biberon ou les deux : activez ce qui vous concerne, c’est modifiable à tout moment.'

export const BABY_EMPTY = 'Rien de noté pour cette journée. Le bouton + est là pour ça 🍼'

export const KIND_LABEL = { feed: 'Repas', diaper: 'Couche', sleep: 'Sommeil', med: 'Soin' } as const
export const KIND_EMOJI = { feed: '🍼', diaper: '🧷', sleep: '😴', med: '💊' } as const
