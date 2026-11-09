/**
 * Projet de naissance : sections et souhaits proposés (modifiables).
 * ⚕️ CONTENU SANTÉ : ce sont des souhaits à discuter avec la sage-femme / la
 * maternité, jamais des consignes médicales.
 */
export const BIRTHPLAN_INTRO =
  'Un projet de naissance rassemble vos souhaits pour l’accouchement et les premiers jours. Il se discute avec la sage-femme ou la maternité (entretien prénatal, consultations). Le jour J, l’équipe peut devoir s’adapter pour votre sécurité et celle de bébé.'

export interface BirthPlanSection {
  key: string
  emoji: string
  title: string
  options: string[]
}

export const BIRTHPLAN: BirthPlanSection[] = [
  { key: 'ambiance', emoji: '🕯️', title: 'Ambiance', options: ['Lumière tamisée', 'Notre musique', 'Le moins de passage possible', 'Photos ou vidéo par le co-parent', 'Pas de photos'] },
  { key: 'accompagnement', emoji: '🤝', title: 'Accompagnement', options: ['Co-parent présent tout du long', 'Co-parent coupe le cordon', 'Être prévenus avant chaque geste', 'Une seule personne en plus de l’équipe'] },
  { key: 'douleur', emoji: '💆', title: 'Gestion de la douleur', options: ['Péridurale souhaitée', 'Plutôt sans péridurale', 'Décider sur le moment', 'Ballon', 'Bain ou douche', 'Bouger, marcher', 'Respiration / sophrologie', 'Massages'] },
  { key: 'travail', emoji: '🌊', title: 'Pendant le travail', options: ['Liberté de mouvement', 'Choisir la position pour accoucher', 'Boire / manger léger si c’est possible', 'Garder nos repères (coussin, vêtements)'] },
  { key: 'naissance', emoji: '👶', title: 'À la naissance', options: ['Peau à peau immédiat', 'Clampage du cordon retardé si possible', 'Découvrir le sexe nous-mêmes', 'Bébé posé directement sur maman', 'Premier moment au calme, à trois'] },
  { key: 'soins', emoji: '🩺', title: 'Premiers soins de bébé', options: ['Soins faits devant nous', 'Un parent accompagne bébé s’il doit sortir', 'Premier bain repoussé', 'Être informés de chaque soin proposé'] },
  { key: 'alimentation', emoji: '🍼', title: 'Alimentation', options: ['Allaitement', 'Biberon', 'Mixte', 'Pas encore décidé', 'Aide pour la première tétée', 'Rencontrer une consultante en lactation'] },
  { key: 'sejour', emoji: '🏥', title: 'Séjour', options: ['Chambre seule si possible', 'Co-parent qui dort sur place', 'Visites limitées', 'Sortie précoce si tout va bien'] },
  { key: 'cesarienne', emoji: '🔪', title: 'En cas de césarienne', options: ['Co-parent présent si possible', 'Voir la naissance (champ abaissé)', 'Peau à peau dès que possible', 'Peau à peau avec le co-parent en attendant'] },
]

export interface BirthPlanValue {
  choices: Record<string, string[]>
  notes: Record<string, string>
  general?: string
}

export const EMPTY_PLAN: BirthPlanValue = { choices: {}, notes: {} }

/** Texte prêt à envoyer / imprimer. */
export function birthPlanText(plan: BirthPlanValue, parents: string, dueDate: string | null): string {
  const lines = [`Projet de naissance — ${parents}`]
  if (dueDate) lines.push(`Date prévue : ${new Date(dueDate + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`)
  lines.push('', 'Nos souhaits, si la situation le permet :')
  for (const s of BIRTHPLAN) {
    const c = plan.choices[s.key] ?? []
    const note = plan.notes[s.key]?.trim()
    if (!c.length && !note) continue
    lines.push('', `${s.emoji} ${s.title}`)
    for (const o of c) lines.push(`• ${o}`)
    if (note) lines.push(`• ${note}`)
  }
  if (plan.general?.trim()) lines.push('', '💬 Un mot pour l’équipe', plan.general.trim())
  lines.push('', 'Merci pour votre accompagnement 🧡')
  return lines.join('\n')
}
