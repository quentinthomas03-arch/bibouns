/**
 * ============================================================================
 *  MODÈLES DE CHECKLISTS (modifiables ici ; une fois ajoutées dans l'appli,
 *  chaque liste se modifie librement depuis l'appli)
 * ============================================================================
 *  Format d'une ligne : [libellé, budget estimé en € (optionnel), échéance]
 *  échéance = id d'une échéance de src/content/milestones.ts (optionnel)
 *  Les budgets sont des ordres de grandeur, à ajuster.
 *  ⚠️ Ajouter une ligne à un modèle n'ajoute rien aux listes déjà créées :
 *  ajouter la ligne à la main dans l'appli dans ce cas.
 * ============================================================================
 */

export type TemplateItem = [label: string, budget?: number | null, milestone?: string]

export interface ChecklistTemplate {
  key: string
  title: string
  emoji: string
  items: TemplateItem[]
}

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    key: 'valise-maman',
    title: 'Valise maternité — Maman',
    emoji: '👜',
    items: [
      ['Dossier de suivi de grossesse, résultats et échographies', null, 'valise'],
      ['Carte vitale, carte de mutuelle, pièce d’identité', null, 'valise'],
      ['Livret de famille'],
      ['Chemises de nuit ou grands t-shirts (x3), ouverture devant si allaitement'],
      ['Gilet ou peignoir confortable'],
      ['Chaussons et chaussettes'],
      ['Culottes jetables ou en coton (x10)', 15],
      ['Serviettes hygiéniques maternité (2 paquets)', 10],
      ['Soutiens-gorge d’allaitement (x2) et coussinets', 40],
      ['Trousse de toilette, serviette, brumisateur', 10],
      ['Bouchons d’oreilles et masque de nuit'],
      ['Chargeur de téléphone avec câble long'],
      ['Snacks et boisson pour la salle de naissance', 10],
      ['Tenue confortable pour la sortie'],
      ['Coussin d’allaitement (si souhaité)', 40],
    ],
  },
  {
    key: 'valise-papa',
    title: 'Valise maternité — Papa',
    emoji: '🎒',
    items: [
      ['Change pour 2-3 jours'],
      ['Trousse de toilette'],
      ['Chargeur, batterie externe', 20],
      ['Snacks, gourde, monnaie pour les distributeurs', 10],
      ['Playlist et écouteurs'],
      ['Appareil photo (ou téléphone avec de la place !)'],
      ['Liste des personnes à prévenir'],
      ['Livre / jeu de cartes pour l’attente'],
      ['Ticket de parking / trajet repéré'],
    ],
  },
  {
    key: 'valise-bebe',
    title: 'Valise maternité — Bébé',
    emoji: '🍼',
    items: [
      ['Bodies taille naissance et 1 mois (x6)', 30],
      ['Pyjamas / grenouillères (x6)', 40],
      ['Brassières ou gilets (x3)', 25],
      ['Bonnet de naissance (x2)', 8],
      ['Chaussettes / chaussons (x4)', 10],
      ['Turbulette / gigoteuse naissance', 30],
      ['Lange en coton (x4)', 20],
      ['Couverture ou nid d’ange pour la sortie', 30],
      ['Tenue de sortie (vérifier la météo !)'],
      ['Couches taille 1 (selon la maternité)', 10],
      ['Siège auto installé dans la voiture', null, 'siege'],
    ],
  },
  {
    key: 'achats',
    title: 'Achats bébé',
    emoji: '🛒',
    items: [
      ['Poussette (+ nacelle ou cosy)', 450],
      ['Siège auto groupe 0+ / i-Size', 200, 'siege'],
      ['Lit bébé ou berceau', 150],
      ['Matelas ferme adapté au lit', 70],
      ['Draps-housses (x3)', 30],
      ['Turbulettes / gigoteuses (x2)', 60],
      ['Table ou matelas à langer', 80],
      ['Baignoire bébé', 25],
      ['Thermomètre de bain et thermomètre médical', 25],
      ['Porte-bébé ou écharpe', 80],
      ['Babyphone', 60],
      ['Transat', 60],
      ['Tapis d’éveil', 40],
      ['Biberons (x4) et goupillon', 35],
      ['Chauffe-biberon (optionnel)', 30],
      ['Couches (stock du premier mois)', 40],
      ['Liniment, coton, carrés de toilette', 15],
      ['Sérum physiologique et mouche-bébé', 15],
      ['Trousse de soin (ciseaux à bouts ronds, brosse…)', 15],
      ['Bodies et pyjamas 1-3 mois', 60],
      ['Bavoirs et langes', 20],
      ['Sac à langer', 50],
    ],
  },
  {
    key: 'maison',
    title: 'Maison & chambre',
    emoji: '🏡',
    items: [
      ['Choisir la pièce / le coin bébé'],
      ['Peinture ou déco de la chambre', 100],
      ['Monter le lit et la table à langer'],
      ['Laver le linge de bébé (lessive douce)', 10],
      ['Installer une veilleuse douce', 20],
      ['Thermomètre de chambre (18–20 °C)', 10],
      ['Rideaux occultants', 40],
      ['Rangements pour les vêtements', 60],
      ['Détecteur de fumée vérifié', 15],
      ['Préparer des repas d’avance au congélateur'],
      ['Organiser l’aide des proches après la naissance'],
    ],
  },
  {
    key: 'demarches',
    title: 'Démarches administratives',
    emoji: '📄',
    items: [
      ['Déclaration de grossesse (Assurance maladie + CAF)', null, 'declaration'],
      ['Inscription à la maternité', null, 'maternite'],
      ['Demande de place en crèche / mode de garde', null, 'garde'],
      ['Vérifier la prime de naissance (CAF)', null, 'paje'],
      ['Prévenir l’employeur du congé de naissance / paternité', null, 'conge-employeur'],
      ['Organiser le congé maternité avec l’employeur', null, 'conge-mat'],
      ['Vérifier la couverture maternité de la mutuelle'],
      ['Choisir le nom de famille (déclaration conjointe si besoin)', null, 'decl-naissance'],
      ['Déclaration de naissance à la mairie (sous 5 jours)', null, 'decl-naissance'],
      ['Déclarer la naissance à la CAF', null, 'caf-naissance'],
      ['Rattacher bébé à l’Assurance maladie et à la mutuelle', null, 'cpam-mutuelle'],
      ['Poser le reste du congé paternité', null, 'conge-pat'],
      ['Décider du congé supplémentaire de naissance (1 ou 2 mois chacun)', null, 'conge-supp'],
    ],
  },
]
