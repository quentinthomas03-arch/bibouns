/**
 * ============================================================================
 *  JOUR J — textes (modifiables)
 *  ⚕️ CONTENU SANTÉ : repères généraux (vérifié nov. 2026). La consigne
 *  donnée par VOTRE maternité est prioritaire.
 * ============================================================================
 */

export const RULE_TITLE = 'Repère pour un 1er bébé'
export const RULE_TEXT =
  'On conseille souvent de partir quand les contractions sont régulières et douloureuses, environ toutes les 5 minutes, depuis à peu près 2 heures. C’est un repère, pas un avis médical : la consigne de votre maternité passe avant.'

export const RULE_STATE = {
  none: { emoji: '⏱️', text: 'Appuie au début et à la fin de chaque contraction.' },
  early: { emoji: '🌱', text: 'Pas encore le rythme du repère. Respirez, reposez-vous, buvez un peu.' },
  close: { emoji: '🧳', text: 'Le rythme se rapproche du repère : préparez-vous, valise près de la porte.' },
  reached: { emoji: '🚗', text: 'Repère atteint : appelez la maternité pour savoir quand venir.' },
}

export const ALERT_TITLE = 'Appelez la maternité tout de suite (ou le 15) si :'
export const ALERTS = [
  'Perte des eaux (liquide qui coule), même sans contraction',
  'Saignements',
  'Bébé bouge moins ou plus du tout',
  'Fièvre, douleur inhabituelle ou continue, malaise',
  'Au moindre doute : on a toujours le droit d’appeler',
]

export const DOCUMENTS = [
  'Pièce d’identité',
  'Carte Vitale (ou attestation)',
  'Carte de mutuelle',
  'Dossier de suivi de grossesse et résultats',
  'Échographies',
  'Carte de groupe sanguin',
  'Livret de famille (ou reconnaissance anticipée)',
  'Choix du nom de famille (si déclaration conjointe)',
]

export const EMERGENCY_NUMBERS = [
  { label: 'SAMU', phone: '15' },
  { label: 'Urgences (européen)', phone: '112' },
]

export const DEFAULT_CONTACT_ROLES = ['Maternité', 'Sage-femme', 'Famille', 'Ami·e', 'Garde animaux', 'Autre']

export const messages = {
  started: (from: string) => `🚀 Ça y est, c’est parti ! On file (bientôt) à la maternité. On vous tient au courant 🧡 — ${from}`,
  born: (p: { name: string; sex: 'f' | 'm' | 'x'; date: string; time: string; weight?: string; length?: string; parents: string }) =>
    `🎉 ${p.name} est ${p.sex === 'f' ? 'née' : p.sex === 'm' ? 'né' : 'né·e'} le ${p.date} à ${p.time}${p.weight ? `, ${p.weight}` : ''}${p.length ? ` et ${p.length}` : ''} ! Tout le monde va bien. Mille bisous de ${p.parents} 🧡`,
}

export const LAUNCH_CONFIRM = 'Lancer le mode Jour J ? Il s’affichera aussi sur le téléphone de ton binôme.'
