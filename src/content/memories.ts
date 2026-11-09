/** Souvenirs : "premières fois" proposées (modifiables, dans l'ordre d'apparition approximatif). */
export const FIRSTS = [
  { key: 'echo', emoji: '🖥️', label: 'Première écho', before: true },
  { key: 'coup-pied', emoji: '🦶', label: 'Premier coup de pied', before: true },
  { key: 'annonce', emoji: '📣', label: 'L’annonce à la famille', before: true },
  { key: 'rencontre', emoji: '👶', label: 'La rencontre' },
  { key: 'maison', emoji: '🏡', label: 'Retour à la maison' },
  { key: 'bain', emoji: '🛁', label: 'Premier bain' },
  { key: 'sortie', emoji: '🌳', label: 'Première balade' },
  { key: 'sourire', emoji: '😊', label: 'Premier sourire' },
  { key: 'gazouillis', emoji: '🗣️', label: 'Premiers gazouillis' },
  { key: 'nuit', emoji: '🌙', label: 'Première (presque) nuit complète' },
  { key: 'rire', emoji: '😂', label: 'Premier éclat de rire' },
  { key: 'retourne', emoji: '🔄', label: 'Se retourne' },
  { key: 'assis', emoji: '🪑', label: 'Tient assis·e' },
  { key: 'dent', emoji: '🦷', label: 'Première dent' },
  { key: 'diversification', emoji: '🥕', label: 'Première purée' },
  { key: 'quatre-pattes', emoji: '🐾', label: 'Quatre pattes' },
  { key: 'mot', emoji: '💬', label: 'Premier mot' },
  { key: 'pas', emoji: '👣', label: 'Premiers pas' },
  { key: 'voyage', emoji: '✈️', label: 'Premier voyage' },
  { key: 'anniversaire', emoji: '🎂', label: 'Premier anniversaire' },
]

export const MEMORY_LIMITS = {
  /** photos par souvenir */
  perMemory: 6,
  /** estimation : taille moyenne d'une photo compressée (Mo) */
  avgPhotoMb: 0.5,
  /** stockage inclus dans l'offre gratuite Supabase (Mo) */
  freeStorageMb: 1024,
}

export const CARD_FOOTER = "Biboun's · avec amour"
