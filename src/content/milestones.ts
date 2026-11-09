/**
 * ============================================================================
 *  CALENDRIER INDICATIF DES ÉCHÉANCES (France)
 * ============================================================================
 *  ⚠️ INDICATIF UNIQUEMENT. Les règles changent (ex. réforme du congé de
 *  naissance) : vérifier sur service-public.fr, ameli.fr, caf.fr, auprès de
 *  l'employeur, de la maternité et du suivi médical.
 *  ⚕️ À VALIDER (Aude) : tous les repères médicaux ci-dessous.
 *
 *  Ancrage des dates :
 *   - { sa: [début, fin] }      : fenêtre en semaines d'aménorrhée
 *   - { due: jours }            : jours par rapport à la date prévue (négatif = avant)
 *   - { birth: [début, fin] }   : jours après la naissance réelle (ou prévue si pas encore né)
 * ============================================================================
 */

export type MilestoneKind = 'medical' | 'admin' | 'prep'

export interface Milestone {
  id: string
  kind: MilestoneKind
  title: string
  detail: string
  anchor: { sa: [number, number] } | { due: number } | { birth: [number, number] }
  /** organisme / où vérifier */
  check?: string
}

export const MILESTONES_DISCLAIMER =
  'Calendrier indicatif, pour vous aider à vous organiser. Les dates officielles et les règles en vigueur sont à vérifier auprès des organismes (Assurance maladie, CAF, mairie, employeur) et de votre suivi médical, qui font foi.'

export const MILESTONES: Milestone[] = [
  // ---------------------------------------------------------------- 1er trimestre
  { id: 'echo1', kind: 'medical', title: '1re échographie', detail: 'Échographie de datation, habituellement entre 11 et 13 SA + 6 j.', anchor: { sa: [11, 13] } },
  { id: 'declaration', kind: 'admin', title: 'Déclaration de grossesse', detail: 'Faite par le médecin ou la sage-femme, à transmettre à l’Assurance maladie et à la CAF avant la fin du 3e mois (14 SA).', anchor: { sa: [10, 14] }, check: 'ameli.fr · caf.fr' },
  { id: 'maternite', kind: 'prep', title: 'Inscription à la maternité', detail: 'Dès que possible : certaines maternités sont vite complètes.', anchor: { sa: [8, 16] } },
  // ---------------------------------------------------------------- 2e trimestre
  { id: 'epp', kind: 'medical', title: 'Entretien prénatal précoce', detail: 'Entretien obligatoire avec une sage-femme ou un médecin, proposé à partir du 4e mois. Le co-parent est bienvenu.', anchor: { sa: [15, 20] } },
  { id: 'consults', kind: 'medical', title: 'Consultations prénatales mensuelles', detail: '7 examens prénataux obligatoires au total, environ un par mois à partir du 4e mois.', anchor: { sa: [15, 41] } },
  { id: 'echo2', kind: 'medical', title: '2e échographie', detail: 'Échographie morphologique, habituellement vers 22 SA (entre 20 et 25 SA).', anchor: { sa: [20, 25] } },
  { id: 'paje', kind: 'admin', title: 'Prime de naissance (CAF)', detail: 'Sous conditions de ressources, après déclaration de grossesse. Vérifier les conditions et la date de versement.', anchor: { sa: [20, 30] }, check: 'caf.fr' },
  { id: 'garde', kind: 'admin', title: 'Mode de garde / crèche', detail: 'Les demandes de place en crèche se font souvent pendant la grossesse (varie selon la commune). Se renseigner tôt à la mairie / relais petite enfance.', anchor: { sa: [20, 30] }, check: 'mairie · monenfant.fr' },
  { id: 'dg', kind: 'medical', title: 'Dépistage du diabète gestationnel (si indiqué)', detail: 'Proposé entre 24 et 28 SA en cas de facteurs de risque, selon l’avis du suivi médical.', anchor: { sa: [24, 28] } },
  { id: 'prepa', kind: 'prep', title: 'Préparation à la naissance', detail: 'Séances prises en charge, à démarrer en général à partir du 6e mois.', anchor: { sa: [24, 32] } },
  // ---------------------------------------------------------------- 3e trimestre
  { id: 'echo3', kind: 'medical', title: '3e échographie', detail: 'Habituellement vers 32 SA (entre 30 et 35 SA).', anchor: { sa: [30, 35] } },
  { id: 'anesth', kind: 'medical', title: 'Consultation d’anesthésie', detail: 'Obligatoire, en général au cours du 8e mois, même sans projet de péridurale.', anchor: { sa: [32, 36] } },
  { id: 'conge-employeur', kind: 'admin', title: 'Prévenir l’employeur du congé de naissance / paternité', detail: 'Au moins 1 mois avant la date prévue du début du congé. Règles en évolution (réforme du congé de naissance) : vérifier les conditions actuelles.', anchor: { due: -45 }, check: 'service-public.fr · employeur' },
  { id: 'conge-mat', kind: 'admin', title: 'Début du congé maternité (prénatal)', detail: 'Pour un 1er enfant : en principe 6 semaines avant la date prévue (report partiel possible sur avis médical).', anchor: { due: -42 }, check: 'ameli.fr · employeur' },
  { id: 'valise', kind: 'prep', title: 'Valise de maternité prête', detail: 'Ainsi que les documents (carte vitale, mutuelle, dossier de suivi, pièce d’identité, livret de famille).', anchor: { sa: [35, 36] } },
  { id: 'siege', kind: 'prep', title: 'Siège auto installé', detail: 'Et un essai de fixation, pour ne pas le découvrir le jour de la sortie.', anchor: { sa: [35, 37] } },
  // ---------------------------------------------------------------- après la naissance
  { id: 'decl-naissance', kind: 'admin', title: 'Déclaration de naissance', detail: 'À la mairie du lieu de naissance, dans les 5 jours qui suivent l’accouchement (souvent possible à la maternité). Penser à la déclaration conjointe de choix de nom si besoin.', anchor: { birth: [0, 5] }, check: 'service-public.fr' },
  { id: 'conge-pat', kind: 'admin', title: 'Congé de naissance + congé paternité', detail: '3 jours de congé de naissance puis une partie obligatoire du congé paternité immédiatement après ; le reste à prendre dans les mois qui suivent. Vérifier les règles en vigueur.', anchor: { birth: [0, 180] }, check: 'service-public.fr' },
  { id: 'caf-naissance', kind: 'admin', title: 'Déclarer la naissance à la CAF', detail: 'Rapidement après la naissance, pour les prestations.', anchor: { birth: [0, 30] }, check: 'caf.fr' },
  { id: 'cpam-mutuelle', kind: 'admin', title: 'Rattacher bébé à l’Assurance maladie et à la mutuelle', detail: 'Ajouter l’enfant sur la carte vitale / le compte ameli et prévenir la mutuelle (délais variables selon le contrat).', anchor: { birth: [0, 30] }, check: 'ameli.fr · mutuelle' },
  { id: 'examen8j', kind: 'medical', title: 'Examen des 8 jours de bébé', detail: 'Examen obligatoire dans les 8 jours, donnant lieu à un certificat de santé.', anchor: { birth: [0, 8] } },
  { id: 'epn', kind: 'medical', title: 'Entretien postnatal précoce', detail: 'Entretien obligatoire, en général entre la 4e et la 8e semaine après l’accouchement.', anchor: { birth: [28, 56] } },
  { id: 'consult-post', kind: 'medical', title: 'Consultation postnatale', detail: 'Dans les 6 à 8 semaines après l’accouchement.', anchor: { birth: [42, 56] } },
]
