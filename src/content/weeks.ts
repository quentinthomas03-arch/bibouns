/**
 * ============================================================================
 *  BIBOUN SEMAINE PAR SEMAINE — taille en fruit/légume + petite phrase
 * ============================================================================
 *  Indexé par semaines d'aménorrhée RÉVOLUES (ex. "15 SA + 6 j" → semaine 15).
 *
 *  ⚕️ À VALIDER (Aude) : tailles et poids MOYENS et APPROXIMATIFS, issus des
 *  repères couramment publiés (longueur tête-fesses jusqu'à ~19 SA, puis
 *  longueur totale). Chaque bébé grandit à son rythme : seule l'échographie
 *  et le suivi médical font foi.
 * ============================================================================
 */

export interface WeekInfo {
  emoji: string
  fruit: string
  /** longueur approximative en cm */
  cm: number
  /** poids approximatif en grammes (0 = moins d'un gramme) */
  g: number
  /** petite phrase fun */
  line: string
}

export const WEEKS: Record<number, WeekInfo> = {
  4: { emoji: '🌱', fruit: 'une graine de pavot', cm: 0.1, g: 0, line: 'Biboun est minuscule… mais il a déjà tout un fan-club.' },
  5: { emoji: '🌾', fruit: 'une graine de sésame', cm: 0.2, g: 0, line: 'Sésame, ouvre-toi : l’aventure commence.' },
  6: { emoji: '🫘', fruit: 'une lentille', cm: 0.5, g: 0, line: 'Une lentille corail, et déjà la star de la maison.' },
  7: { emoji: '🫐', fruit: 'une myrtille', cm: 1, g: 1, line: 'Petit mais costaud, version myrtille.' },
  8: { emoji: '🍇', fruit: 'une framboise', cm: 1.6, g: 1, line: 'Framboise un jour, framboise toujours (dans nos cœurs).' },
  9: { emoji: '🍒', fruit: 'une cerise', cm: 2.3, g: 2, line: 'La cerise sur le gâteau de l’automne.' },
  10: { emoji: '🍓', fruit: 'une fraise', cm: 3.1, g: 4, line: 'Fraise des bois, discrète mais déterminée.' },
  11: { emoji: '🟢', fruit: 'une figue', cm: 4.1, g: 7, line: 'Mi-figue, mi-raisin ? Non : 100 % Biboun.' },
  12: { emoji: '🍋‍🟩', fruit: 'un citron vert', cm: 5.4, g: 14, line: 'Un zeste de Biboun, et tout est plus pétillant.' },
  13: { emoji: '🍑', fruit: 'une pêche', cm: 7.4, g: 23, line: 'Biboun a la pêche, et ça se voit !' },
  14: { emoji: '🍋', fruit: 'un citron', cm: 8.7, g: 43, line: 'Pas acide pour un sou, promis.' },
  15: { emoji: '🍎', fruit: 'une pomme', cm: 10.1, g: 70, line: 'Une pomme d’automne, croquante et pleine d’énergie.' },
  16: { emoji: '🥑', fruit: 'un avocat', cm: 11.6, g: 100, line: 'Biboun a son avocat : il plaide pour plus de câlins.' },
  17: { emoji: '🧅', fruit: 'un navet', cm: 13, g: 140, line: 'Un navet ? Jamais de la vie : un chef-d’œuvre.' },
  18: { emoji: '🫑', fruit: 'un poivron', cm: 14.2, g: 190, line: 'Doux comme un poivron rouge (le meilleur).' },
  19: { emoji: '🥭', fruit: 'une mangue', cm: 15.3, g: 240, line: 'Exotique et sucré : Biboun mange(ue) bien.' },
  20: { emoji: '🍌', fruit: 'une banane', cm: 25.6, g: 300, line: 'Mi-parcours ! Biboun a la banane.' },
  21: { emoji: '🥕', fruit: 'une carotte', cm: 26.7, g: 360, line: 'Les carottes sont cuites… pour la tranquillité. Ça bouge !' },
  22: { emoji: '🍈', fruit: 'une papaye', cm: 27.8, g: 430, line: 'Papa-ye, maman-ye : Biboun vous entend peut-être.' },
  23: { emoji: '🍊', fruit: 'un pamplemousse', cm: 28.9, g: 500, line: 'Un pamplemousse rose, comme nos joues de futurs parents.' },
  24: { emoji: '🌽', fruit: 'un épi de maïs', cm: 30, g: 600, line: 'Biboun fait son pop-corn : ça s’agite là-dedans.' },
  25: { emoji: '🥦', fruit: 'un chou-fleur', cm: 34.6, g: 660, line: 'Mignon comme un chou (-fleur).' },
  26: { emoji: '🥬', fruit: 'une laitue', cm: 35.6, g: 760, line: 'Une salade de câlins, sans vinaigrette.' },
  27: { emoji: '🥦', fruit: 'un brocoli', cm: 36.6, g: 875, line: 'Petit arbre vert, grand cœur.' },
  28: { emoji: '🍆', fruit: 'une aubergine', cm: 37.6, g: 1000, line: 'Dernier trimestre ! Biboun passe le kilo.' },
  29: { emoji: '🎃', fruit: 'une courge butternut', cm: 38.6, g: 1150, line: 'Une courge d’automne, notre saison préférée.' },
  30: { emoji: '🥬', fruit: 'un chou', cm: 39.9, g: 1300, line: 'Mon petit chou, au sens propre.' },
  31: { emoji: '🥥', fruit: 'une noix de coco', cm: 41.1, g: 1500, line: 'Dur à l’extérieur ? Non, tout doux partout.' },
  32: { emoji: '🍠', fruit: 'une courge spaghetti', cm: 42.4, g: 1700, line: 'Al dente et plein de tendresse.' },
  33: { emoji: '🍍', fruit: 'un ananas', cm: 43.7, g: 1900, line: 'Biboun a une coiffure d’ananas ? On verra bientôt !' },
  34: { emoji: '🍈', fruit: 'un melon', cm: 45, g: 2100, line: 'Biboun prend le melon (et il a raison).' },
  35: { emoji: '🍈', fruit: 'un melon miel', cm: 46.2, g: 2400, line: 'Doux comme le miel, rond comme un melon.' },
  36: { emoji: '🥬', fruit: 'une laitue romaine', cm: 47.4, g: 2600, line: 'Valise prête ? Biboun, lui, peaufine ses entrées.' },
  37: { emoji: '🌿', fruit: 'une botte de blettes', cm: 48.6, g: 2900, line: 'Une botte de bonheur prête à éclore.' },
  38: { emoji: '🥬', fruit: 'un poireau', cm: 49.8, g: 3100, line: 'On ne fait plus le poireau très longtemps…' },
  39: { emoji: '🍉', fruit: 'une petite pastèque', cm: 50.7, g: 3300, line: 'Biboun est presque prêt pour sa première.' },
  40: { emoji: '🎃', fruit: 'une citrouille', cm: 51.2, g: 3500, line: 'Bientôt minuit, la citrouille va se transformer…' },
  41: { emoji: '🍉', fruit: 'une pastèque', cm: 51.5, g: 3600, line: 'Biboun prend son temps : les meilleurs se font attendre.' },
}

export function weekInfo(weeks: number): WeekInfo | null {
  if (weeks < 4) return null
  return WEEKS[Math.min(weeks, 41)] ?? null
}

export function formatWeight(g: number): string {
  if (g === 0) return 'moins d’un gramme'
  if (g < 1000) return `~${g} g`
  return `~${(g / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg`
}

export function formatLength(cm: number): string {
  if (cm < 1) return `~${Math.round(cm * 10)} mm`
  return `~${cm.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} cm`
}

/**
 * Petits conseils pratiques par période, pour la maman et pour le papa.
 * Ton : complice, jamais injonctif. ⚕️ À VALIDER (Aude) pour la partie maman.
 */
export interface TipPeriod {
  from: number // SA révolues (incluses)
  to: number // SA révolues (incluses)
  maman: string
  papa: string
}

export const TIPS: TipPeriod[] = [
  { from: 0, to: 13, maman: 'Fatigue et nausées sont fréquentes au début : écoute ton corps et note ce qui t’aide dans le journal.', papa: 'Prends en charge les courses et les odeurs de cuisine : héros discret du 1er trimestre.' },
  { from: 14, to: 17, maman: 'C’est le bon moment pour l’entretien prénatal précoce avec une sage-femme ou ton médecin : on y parle de tout, sans tabou.', papa: 'Renseigne-toi sur le congé de naissance et préviens ton employeur à l’avance : vérifie les règles à jour sur service-public.fr.' },
  { from: 18, to: 22, maman: 'Les premiers mouvements arrivent souvent par ici : note la date dans le journal, c’est un joli souvenir.', papa: 'Lance la liste des achats bébé et compare les prix : le budget sera content.' },
  { from: 23, to: 27, maman: 'Pense à t’inscrire aux séances de préparation à la naissance : il y en a plusieurs, prises en charge.', papa: 'Mode de garde : selon la commune, les inscriptions en crèche se font tôt. On s’y met ?' },
  { from: 28, to: 31, maman: 'Le 3e trimestre commence : garde tes questions pour les prochains rendez-vous dans l’onglet Suivi.', papa: 'Monte les meubles de la chambre maintenant : plus tard, tu auras les mains prises.' },
  { from: 32, to: 35, maman: 'La consultation d’anesthésie a lieu en général au 8e mois : pense à la caler.', papa: 'Repère le trajet vers la maternité (de jour ET de nuit) et l’endroit où se garer.' },
  { from: 36, to: 38, maman: 'Valise prête et documents au même endroit : tu pourras souffler.', papa: 'Installe le siège auto dans la voiture et entraîne-toi à le fixer. Si, si.' },
  { from: 39, to: 45, maman: 'Repos, balades douces et confiance : vous êtes prêts. Au moindre doute, appelle la maternité.', papa: 'Téléphone chargé, réservoir plein, sac sous la main : mode Jour J activé.' },
]

export function tipsFor(weeks: number): TipPeriod | null {
  return TIPS.find((t) => weeks >= t.from && weeks <= t.to) ?? null
}
