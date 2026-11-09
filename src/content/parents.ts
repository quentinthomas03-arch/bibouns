/**
 * Suivi des parents après la naissance.
 * ⚕️ CONTENU SANTÉ — sources : Santé publique France / 1000 premiers jours,
 * Enquête nationale périnatale 2021, 3114 (vérifié nov. 2026). Informatif,
 * jamais un diagnostic.
 */
export const FEELINGS = ['Heureux·se', 'Fier·e', 'Serein·e', 'Bien entouré·e', 'Fatigué·e', 'Débordé·e', 'Anxieux·se', 'Irritable', 'Pleure facilement', 'Seul·e', 'Douleurs', 'Mal dormi']

export const ENERGY = [
  { value: 1, emoji: '🪫', label: 'À plat' },
  { value: 2, emoji: '😮‍💨', label: 'Fatigué·e' },
  { value: 3, emoji: '🙂', label: 'Ça tient' },
  { value: 4, emoji: '💪', label: 'En forme' },
  { value: 5, emoji: '⚡', label: 'Pleine forme' },
]

export const PAIN = [
  { value: 0, label: 'Aucune' },
  { value: 1, label: 'Légère' },
  { value: 2, label: 'Moyenne' },
  { value: 3, label: 'Forte' },
]

export const PARENTS_INTRO =
  'Un petit point par jour, pour chacun de vous : bébé n’est pas le seul à vivre un grand changement. Vous voyez les points l’un de l’autre, pour veiller l’un sur l’autre.'

export const SUPPORT = {
  title: 'Prendre soin de vous',
  lines: [
    'Le « baby blues » est fréquent les premiers jours après la naissance (larmes, émotions en montagne russe) et passe en quelques jours.',
    'Si la tristesse, l’anxiété ou l’épuisement durent plus de deux semaines, parlez-en : médecin, sage-femme, PMI. La dépression du post-partum se soigne ; elle touche environ 1 mère sur 6 et 1 père sur 10, et peut survenir pendant toute la première année.',
    'Idées noires : appelez le 3114 (gratuit, 24 h/24, 7 j/7). Urgence : 15.',
  ],
  alertTitle: 'Plusieurs jours difficiles d’affilée',
  alert: 'Ce n’est pas un diagnostic, juste un signal : c’est peut-être le moment d’en parler à quelqu’un (votre binôme, un proche, la sage-femme, le médecin).',
}

export const MOM_CARE = [
  'Consultation postnatale : dans les 6 à 8 semaines après l’accouchement.',
  'Entretien postnatal précoce : entre la 4e et la 8e semaine, pour parler de vous (pas seulement de bébé).',
  'La rééducation du périnée est souvent prescrite lors de la consultation postnatale : modalités de prise en charge à vérifier sur ameli.fr.',
]
