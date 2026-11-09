/**
 * ============================================================================
 *  CARNET DE SANTÉ — calendrier vaccinal et examens de suivi (France)
 * ============================================================================
 *  ⚕️ CONTENU SANTÉ — sources : calendrier des vaccinations 2025 (ministère de
 *  la Santé / HAS), obligations méningocoques B et ACWY au 1er janvier 2025,
 *  avis HAS 2026 sur le pneumocoque (Prevenar 20, schéma 3+1), vérifié nov. 2026.
 *  Le calendrier est mis à jour chaque année : le carnet de santé papier et le
 *  médecin font foi.
 * ============================================================================
 */

export const VACCINE_DISCLAIMER =
  'Calendrier indicatif, mis à jour chaque année par les autorités de santé. Le carnet de santé et le médecin font foi : c’est lui qui fixe les dates et les vaccins.'

export interface VaccineDose {
  code: string
  label: string
  /** âge conseillé en mois */
  months: number
  /** "16-18 mois" etc. si fenêtre */
  ageLabel?: string
  mandatory: boolean
  note?: string
}

export const VACCINES: VaccineDose[] = [
  { code: 'hexa-1', label: 'Diphtérie, tétanos, polio, coqueluche, Hib, hépatite B (1re dose)', months: 2, mandatory: true },
  { code: 'pneumo-1', label: 'Pneumocoque (1re dose)', months: 2, mandatory: true },
  { code: 'rota-1', label: 'Rotavirus (1re dose, par la bouche)', months: 2, mandatory: false, note: 'Recommandé. 2 ou 3 doses selon le vaccin utilisé.' },
  { code: 'menb-1', label: 'Méningocoque B (1re dose)', months: 3, mandatory: true },
  { code: 'rota-2', label: 'Rotavirus (2e dose)', months: 3, mandatory: false },
  { code: 'hexa-2', label: 'DTCaP-Hib-hépatite B (2e dose)', months: 4, mandatory: true },
  { code: 'pneumo-2', label: 'Pneumocoque (2e dose)', months: 4, mandatory: true },
  { code: 'rota-3', label: 'Rotavirus (3e dose, selon le vaccin)', months: 4, mandatory: false, note: 'Uniquement avec le vaccin à 3 doses.' },
  { code: 'menb-2', label: 'Méningocoque B (2e dose)', months: 5, mandatory: true },
  { code: 'menacwy-1', label: 'Méningocoques ACWY (1re dose)', months: 6, mandatory: true },
  { code: 'pneumo-3', label: 'Pneumocoque (3e dose, nouveau schéma)', months: 6, mandatory: true, note: 'Dose ajoutée avec le vaccin Prevenar 20 (avis HAS 2026). À confirmer avec le médecin selon le calendrier en vigueur.' },
  { code: 'hexa-3', label: 'DTCaP-Hib-hépatite B (rappel)', months: 11, mandatory: true },
  { code: 'pneumo-r', label: 'Pneumocoque (rappel)', months: 11, mandatory: true },
  { code: 'ror-1', label: 'Rougeole, oreillons, rubéole (1re dose)', months: 12, mandatory: true },
  { code: 'menacwy-r', label: 'Méningocoques ACWY (rappel)', months: 12, mandatory: true },
  { code: 'menb-r', label: 'Méningocoque B (rappel)', months: 12, mandatory: true },
  { code: 'ror-2', label: 'Rougeole, oreillons, rubéole (2e dose)', months: 16, ageLabel: '16-18 mois', mandatory: true },
]

/** Prévention de la bronchiolite (anticorps, ce n'est pas un vaccin) — saisonnière. */
export const RSV_INFO = {
  code: 'vrs',
  label: 'Prévention de la bronchiolite (VRS)',
  note: 'Anticorps (ce n’est pas un vaccin) proposé à tous les nourrissons pour leur première saison de VRS (en métropole, de mi-septembre à fin février) : à la maternité si bébé naît pendant la campagne, sinon dès le début de la campagne suivante. Modalités fixées chaque année : en parler au pédiatre.',
}

/**
 * Examens de suivi de l'enfant jusqu'à 2 ans (remboursés à 100 %).
 * Certificats de santé obligatoires : 8 jours, 9 mois, 24 mois.
 */
export const CHILD_EXAMS = [
  { code: 'ex-8j', label: 'Examen des 8 jours', days: 0, windowDays: 8, certificate: true },
  { code: 'ex-2s', label: 'Examen de la 2e semaine', days: 8, windowDays: 7 },
  { code: 'ex-1m', label: 'Examen du 1er mois', months: 1 },
  { code: 'ex-2m', label: 'Examen du 2e mois', months: 2 },
  { code: 'ex-3m', label: 'Examen du 3e mois', months: 3 },
  { code: 'ex-4m', label: 'Examen du 4e mois', months: 4 },
  { code: 'ex-5m', label: 'Examen du 5e mois', months: 5 },
  { code: 'ex-6m', label: 'Examen du 6e mois', months: 6 },
  { code: 'ex-9m', label: 'Examen du 9e mois', months: 9, certificate: true },
  { code: 'ex-12m', label: 'Examen du 12e mois', months: 12 },
  { code: 'ex-13m', label: 'Examen du 13e mois', months: 13 },
  { code: 'ex-16m', label: 'Examen des 16-18 mois', months: 16 },
  { code: 'ex-24m', label: 'Examen des 24 mois', months: 24, certificate: true },
] as { code: string; label: string; months?: number; days?: number; windowDays?: number; certificate?: boolean }[]

export const EXAMS_DISCLAIMER =
  'Repères des examens de suivi de l’enfant (souvent couplés aux vaccins). Le calendrier officiel a évolué récemment : le médecin et le carnet de santé font foi.'

export const GROWTH_NOTE =
  'Courbes de l’Organisation mondiale de la santé (OMS, 2006). Le carnet de santé français utilise depuis 2018 des courbes françaises (AFPA – CRESS/Inserm) : les repères peuvent légèrement différer. Une mesure isolée ne veut rien dire : c’est l’allure de la courbe qui compte, et c’est le médecin qui l’interprète.'

export const DOC_KINDS = ['Ordonnance', 'Compte rendu', 'Analyse', 'Échographie', 'Courrier', 'Autre']
