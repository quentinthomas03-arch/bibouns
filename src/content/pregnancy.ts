/**
 * Contenus du suivi de grossesse (modifiables).
 * ⚕️ À VALIDER (Aude) : liste des symptômes.
 */

export const APPOINTMENT_KINDS = [
  { key: 'echo', label: 'Échographie', emoji: '🖥️' },
  { key: 'consultation', label: 'Consultation', emoji: '🩺' },
  { key: 'blood', label: 'Prise de sang', emoji: '🩸' },
  { key: 'prep', label: 'Préparation', emoji: '🧘' },
  { key: 'other', label: 'Autre', emoji: '📌' },
] as const

export type AppointmentKind = (typeof APPOINTMENT_KINDS)[number]['key']

export const kindInfo = (k: string) => APPOINTMENT_KINDS.find((x) => x.key === k) ?? APPOINTMENT_KINDS[4]

/** Échéance du calendrier → type de rendez-vous suggéré */
export const MILESTONE_TO_APPOINTMENT: Record<string, { kind: AppointmentKind; title: string }> = {
  echo1: { kind: 'echo', title: '1re échographie' },
  echo2: { kind: 'echo', title: '2e échographie' },
  echo3: { kind: 'echo', title: '3e échographie' },
  epp: { kind: 'consultation', title: 'Entretien prénatal précoce' },
  anesth: { kind: 'consultation', title: 'Consultation d’anesthésie' },
  dg: { kind: 'blood', title: 'Dépistage diabète gestationnel' },
  prepa: { kind: 'prep', title: 'Préparation à la naissance' },
}

export const REMINDER_OPTIONS = [
  { minutes: 0, label: 'Aucun' },
  { minutes: 120, label: '2 h avant' },
  { minutes: 1440, label: 'La veille' },
  { minutes: 2880, label: '2 jours avant' },
]

export const MOODS = [
  { value: 1, emoji: '😩', label: 'Dur dur' },
  { value: 2, emoji: '😕', label: 'Bof' },
  { value: 3, emoji: '😐', label: 'Ça va' },
  { value: 4, emoji: '🙂', label: 'Bien' },
  { value: 5, emoji: '🤩', label: 'Au top' },
]

export const SYMPTOMS = [
  'Fatigue', 'Nausées', 'Brûlures d’estomac', 'Maux de dos', 'Jambes lourdes', 'Crampes',
  'Insomnie', 'Envies', 'Émotions en montagne russe', 'Bébé bouge !', 'Contractions', 'Essoufflement',
  'Maux de tête', 'Ballonnements', 'Pleine forme',
]

export const JOURNAL_EMPTY = 'Le journal est vide. Une humeur, un symptôme, un souvenir : tout compte.'

export const MEASURE_NOTE =
  'Ces courbes servent de mémoire, pas de diagnostic : les valeurs s’interprètent avec la sage-femme ou le médecin.'
