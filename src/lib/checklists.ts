import { CHECKLIST_TEMPLATES, type ChecklistTemplate } from '@/content/checklists'
import { datedMilestones } from './milestones'

export interface ChecklistRow {
  id: string
  title: string
  kind: string
  emoji?: string | null
  position: number
}
export interface ItemRow {
  id: string
  checklist_id: string
  label: string
  done: boolean
  done_by?: string | null
  done_at?: string | null
  assignee?: string | null
  due_date?: string | null
  note?: string | null
  budget_cents?: number | null
  position: number
  /** réservé par un proche via la liste de naissance partagée */
  reserved_by?: string | null
}

/**
 * Lignes à créer pour un modèle. Les identifiants sont DÉTERMINISTES
 * (dérivés du foyer + modèle + index) : si les deux téléphones ajoutent le
 * même modèle en même temps, ils écrivent les mêmes lignes => pas de doublon.
 */
export function templateRows(
  tpl: ChecklistTemplate,
  idFor: (...parts: string[]) => string,
  dueDate: string | null,
  position: number,
): { list: ChecklistRow; items: ItemRow[] } {
  const ends = new Map<string, string>()
  if (dueDate) for (const m of datedMilestones(dueDate)) ends.set(m.id, m.end)
  const listId = idFor('tpl', tpl.key)
  return {
    list: { id: listId, title: tpl.title, kind: tpl.key, emoji: tpl.emoji, position },
    items: tpl.items.map(([label, budget, milestone], i) => ({
      id: idFor('tpl', tpl.key, String(i)),
      checklist_id: listId,
      label,
      done: false,
      budget_cents: budget ? Math.round(budget * 100) : null,
      due_date: milestone ? (ends.get(milestone) ?? null) : null,
      position: i,
    })),
  }
}

export function listStats(items: Pick<ItemRow, 'done' | 'budget_cents'>[]) {
  const total = items.length
  const done = items.filter((i) => i.done).length
  const budget = items.reduce((s, i) => s + (i.budget_cents ?? 0), 0)
  const remaining = items.filter((i) => !i.done).reduce((s, i) => s + (i.budget_cents ?? 0), 0)
  return { total, done, budget, remaining, progress: total ? done / total : 0 }
}

export const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: cents % 100 ? 2 : 0 })

/** Position entre deux voisins (insertion/réordonnancement sans tout renuméroter). */
export const between = (a: number | undefined, b: number | undefined) =>
  a === undefined && b === undefined ? 0 : a === undefined ? b! - 1 : b === undefined ? a + 1 : (a + b) / 2

export { CHECKLIST_TEMPLATES }

/**
 * « Mes tâches » pour l'accueil : ce qui m'est attribué (non fait), trié par
 * échéance, + les tâches sans responsable qui arrivent dans les 3 jours.
 */
export function myTasks<T extends Pick<ItemRow, 'id' | 'done' | 'assignee' | 'due_date'>>(items: T[], memberId: string, today: string, limit = 5): T[] {
  const soon = new Date(today + 'T12:00')
  soon.setDate(soon.getDate() + 3)
  const soonIso = soon.toISOString().slice(0, 10)
  const mine = items.filter((i) => !i.done && (i.assignee === memberId || (!i.assignee && i.due_date && i.due_date <= soonIso)))
  return mine.sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')).slice(0, limit)
}
