import { Link } from 'react-router-dom'
import { CalendarClock, Check, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { useRows, useStore, nowIso } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'
import { myTasks, type ChecklistRow, type ItemRow } from '@/lib/checklists'

type Item = BaseRow & ItemRow
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Accueil : mes tâches à venir, à cocher sans ouvrir les listes. */
export function MyTasks() {
  const items = useRows<Item>('checklist_items') ?? []
  const lists = useRows<BaseRow & ChecklistRow>('checklists') ?? []
  const { memberId, patch } = useStore()
  const toast = useToast()
  const today = localToday()
  const tasks = myTasks(items, memberId, today)
  if (tasks.length === 0) return null
  const listOf = (id: string) => lists.find((l) => l.id === id)

  return (
    <Card className="mt-4">
      <Link to="/listes" className="press flex items-center justify-between mb-2">
        <h2 className="font-display text-xl font-semibold">✅ Mes tâches</h2>
        <ChevronRight className="text-ink-soft" />
      </Link>
      <ul className="flex flex-col gap-1">
        {tasks.map((t) => {
          const late = t.due_date && t.due_date < today
          const l = listOf(t.checklist_id)
          return (
            <li key={t.id} className="flex items-center gap-2">
              <button
                aria-label={`Cocher ${t.label}`}
                onClick={async () => {
                  await patch('checklist_items', t.id, { done: true, done_by: memberId, done_at: nowIso() })
                  toast('Bien joué ✅', { label: 'Annuler', run: () => patch('checklist_items', t.id, { done: false, done_by: null, done_at: null }) })
                }}
                className="press size-11 shrink-0 grid place-items-center"
              >
                <span className="size-7 rounded-full border-[3px] border-line grid place-items-center">
                  <Check size={14} className="opacity-0" />
                </span>
              </button>
              <Link to={`/listes/${t.checklist_id}`} className="flex-1 min-w-0 py-1">
                <span className="block font-semibold leading-snug truncate">{t.label}</span>
                <span className="flex gap-2 text-xs text-ink-soft">
                  {l && (
                    <span className="truncate">
                      {l.emoji} {l.title}
                    </span>
                  )}
                  {t.due_date && (
                    <span className={`inline-flex items-center gap-1 shrink-0 ${late ? 'text-danger font-bold' : ''}`}>
                      <CalendarClock size={12} aria-hidden />
                      {late ? 'en retard · ' : ''}
                      {new Date(t.due_date + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
