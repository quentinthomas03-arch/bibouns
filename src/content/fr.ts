/**
 * ============================================================================
 *  TOUS LES TEXTES DE L'APPLI SONT ICI.
 * ============================================================================
 *  Pour modifier un texte : change la valeur entre guillemets, puis commit.
 *  L'appli se met à jour toute seule après le déploiement.
 *
 *  Repère "⚕️ À VALIDER (Aude)" = contenu à caractère médical à relire.
 *  Les fichiers de contenu des modules suivants (semaines, vaccins,
 *  démarches...) seront ajoutés dans ce même dossier src/content/.
 * ============================================================================
 */

export const app = {
  name: "Biboun's",
  tagline: 'La team Biboun’s, version 3 joueurs bientôt 🧡',
}

export const phases = {
  before: { label: 'Avant', emoji: '🤰', title: 'En attendant Biboun' },
  dday: { label: 'Jour J', emoji: '🚀', title: 'C’est le grand jour !' },
  after: { label: 'Après', emoji: '👶', title: 'Bienvenue Biboun' },
}

export const greetings = {
  morning: ['Bonjour {name} ☀️', 'Debout {name}, le café t’attend', 'Hello {name} !'],
  afternoon: ['Coucou {name} 👋', 'Re-bonjour {name}', 'Hey {name} !'],
  evening: ['Bonsoir {name} 🌙', 'Belle soirée {name}', 'Coucou {name}, on souffle un peu ?'],
  night: ['Courage {name} 🌙', 'Chut… tout le monde dort (presque)', 'Nuit étoilée, {name}'],
}

export const countdown = {
  daysLeft: (n: number) => (n > 1 ? `J-${n}` : n === 1 ? 'J-1 !' : n === 0 ? 'C’est aujourd’hui !' : `Terme + ${-n} j`),
  daysLeftLong: (n: number) =>
    n > 1 ? `encore ${n} jours avant la rencontre` : n === 1 ? 'demain, peut-être !' : n === 0 ? 'jour prévu, on croise les doigts' : 'Biboun prend son temps…',
  month: (m: number) => (m === 1 ? '1er mois' : `${m}e mois`),
  trimester: (t: number) => (t === 1 ? '1er trimestre' : `${t}e trimestre`),
  week: (w: number) => `${w}e semaine`,
  noDueDate: 'Ajoute la date prévue dans les réglages pour lancer le compte à rebours.',
}

export const onboarding = {
  welcomeTitle: 'Bienvenue chez Biboun’s',
  welcomeText: 'L’appli de Quentin & Aude pour vivre la grossesse, le Jour J et la suite… à deux, en temps réel.',
  create: 'Créer notre foyer',
  createHint: 'Le premier d’entre vous commence ici',
  join: 'J’ai un code d’invitation',
  joinHint: 'L’autre a déjà créé le foyer',
  recover: 'J’ai un code de secours',
  recoverHint: 'Nouveau téléphone ? On te retrouve.',
  firstName: 'Ton prénom',
  pickAvatar: 'Ton avatar',
  pickColor: 'Ta couleur',
  dueDate: 'Date prévue d’accouchement',
  dueDateHint: 'Modifiable à tout moment dans les réglages.',
  inviteCode: 'Code d’invitation',
  recoveryCode: 'Code de secours',
  createCta: 'C’est parti !',
  joinCta: 'Rejoindre le foyer',
  recoverCta: 'Récupérer mon profil',
  inviteTitle: 'Foyer créé ! 🎉',
  inviteText: 'Donne ce code à ton binôme pour qu’il ou elle te rejoigne. Valable 7 jours.',
  share: 'Envoyer le code',
  shareMessage: (code: string, url: string) =>
    `Rejoins-moi sur Biboun’s 🧡\n1. Ouvre ${url} dans Safari\n2. Partager → « Sur l’écran d’accueil »\n3. Ouvre l’appli et tape le code : ${code}`,
  recoveryTitle: 'Ton code de secours 🔑',
  recoveryText:
    'Garde-le précieusement (Notes, gestionnaire de mots de passe…). C’est la seule façon de retrouver ton profil si tu changes de téléphone ou supprimes l’appli.',
  recoveryCopied: 'Code copié !',
  recoveryDone: 'C’est noté, on y va',
  back: 'Retour',
}

export const install = {
  title: 'Installe d’abord l’appli',
  text: 'Sur iPhone, l’appli doit être ajoutée à l’écran d’accueil pour garder ta connexion, marcher hors ligne et recevoir les notifications.',
  steps: [
    'Touche le bouton Partager (le carré avec une flèche ↑) en bas de Safari',
    'Fais défiler et choisis « Sur l’écran d’accueil »',
    'Touche « Ajouter » puis ouvre Biboun’s depuis l’écran d’accueil',
  ],
  continueAnyway: 'Continuer dans le navigateur (pour tester)',
}

export const errors: Record<string, string> = {
  code_invalide: 'Ce code ne marche pas. Vérifie les lettres (ou demande un nouveau code).',
  foyer_complet: 'Ce foyer a déjà ses deux membres.',
  deja_membre: 'Ce téléphone fait déjà partie d’un foyer.',
  trop_de_tentatives: 'Trop d’essais. Réessaie dans une heure.',
  non_connecte: 'Connexion impossible. Vérifie ton réseau.',
  reseau: 'Pas de réseau pour le moment. Réessaie dès que possible.',
  inconnu: 'Oups, quelque chose a coincé. Réessaie ?',
}

export const sync = {
  idle: 'Synchronisé',
  syncing: 'Synchro…',
  offline: 'Hors ligne — tout est gardé ici',
  error: 'Souci de synchro',
  pending: (n: number) => `${n} en attente`,
}

export const notes = {
  title: 'Mots doux',
  placeholder: 'Un petit mot pour ton binôme…',
  empty: 'Aucun mot doux pour l’instant. Lance-toi 💌',
  send: 'Envoyer',
  quick: ['Je pense à toi 💛', 'T’es le/la meilleur·e', 'Pause câlin ?', 'J’ai acheté des couches !'],
}

export const soon = {
  title: 'Bientôt ici !',
  text: 'Biboun est encore en train de construire cette partie. Patience 🛠️',
}

export const tabs = {
  home: 'Accueil',
  track: 'Suivi',
  lists: 'Listes',
  more: 'Plus',
  quick: 'Ajouter',
}

export const quickActions = {
  title: 'Ajout rapide',
  note: 'Mot doux',
}

export const settings = {
  title: 'Réglages',
  profile: 'Mon profil',
  household: 'Notre foyer',
  pregnancy: 'Grossesse',
  phase: 'Phase de l’appli',
  phaseAuto: 'Automatique',
  phaseAutoHint: 'Selon la date prévue et la naissance',
  appearance: 'Apparence',
  themeAuto: 'Auto',
  themeLight: 'Clair',
  themeDark: 'Veilleuse',
  security: 'Sécurité',
  newRecovery: 'Générer un nouveau code de secours',
  newRecoveryConfirm: 'L’ancien code ne marchera plus. Continuer ?',
  newInvite: 'Nouveau code d’invitation',
  waitingPartner: 'En attente de ton binôme…',
  syncTitle: 'Synchronisation',
  syncNow: 'Synchroniser maintenant',
  setAside: (n: number) => `${n} saisie(s) refusée(s) par le serveur, mises de côté`,
  about: 'À propos',
  privacy:
    'Vos données sont stockées chez Supabase (Francfort, UE), chiffrées en transit, et seul votre foyer peut les lire. Aucune pub, aucun traqueur, aucune analytics.',
  signOut: 'Déconnecter ce téléphone',
  signOutConfirm:
    'Tu auras besoin de ton code de secours pour revenir. Les saisies non synchronisées seront perdues. Continuer ?',
  saved: 'Enregistré ✓',
}

export const avatars = ['🦊', '🐻', '🐰', '🦉', '🐨', '🐼', '🦁', '🐯', '🐸', '🐙', '🦄', '🐝', '🌻', '🍂', '🍄', '🌙']

/** Couleurs de profil (bonnes en clair comme en sombre) */
export const memberColors = ['#C2603F', '#E0897A', '#D9A13B', '#8FA584', '#C98AA0', '#7C8DB5', '#B07A57', '#E57F4F']
