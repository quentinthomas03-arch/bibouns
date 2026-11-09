import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Plus, Trash2, CalendarClock, StickyNote } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Field, TextArea } from '@/components/ui/Field'
import { Avatar } from '@/components/ui/Avatar'
import { Segmented } from '@/components/ui/Segmented'
import { MemberPicker } from '@/components/MemberPicker'
import { useToast } from '@/components/ui/Toast'
import { useMembers } from '@/app/members'
import { useRows, useStore, nowIso } from '@/sync/store'
import { between, euros, listStats, type ChecklistRow, type ItemRow } from '@/lib/checklists'
import type { BaseRow } from '@/sync/tables'

type List = BaseRow & ChecklistRow
type Item = BaseRow & ItemRow
type Filter = 'all' | 'todo' | 'mine'

const today = () => new Date().toISOString().slice(0, 10)

export function ListDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lists = useRows<List>('checklists')
  const list = lists?.find((l) => l.id === id)
  const items = useRows<Item>('checklist_items', (i) => i.checklist_id === id, [id])
  const { save, patch, remove, memberId } = useStore()
  const { byId } = useMembers()
  const toast = useToast()
  const [text, setText] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Item | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const sorted = useMemo(() => {
    const all = [...(items ?? [])].sort((a, b) => Number(a.done) - Number(b.done) || a.position - b.position)
    return all.filter((i) => (filter === 'todo' ? !i.done : filter === 'mine' ? i.assignee === memberId : true))
  }, [items, filter, memberId])
  const stats = listStats(items ?? [])

  if (lists && !list) {
    return (
      <div className="p-6 pt-safe">
        <Link to="/listes" className="font-bold text-primary underline">
          ← Liste introuvable, retour
        </Link>
      </div>
    )
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!text.trim() || !id) return
    const last = (items ?? []).reduce((m, i) => Math.max(m, i.position), -1)
    await save('checklist_items', { checklist_id: id, label: text.trim(), done: false, position: between(last, undefined) })
    setText('')
  }

  const toggle = (i: Item) =>
    patch('checklist_items', i.id, i.done ? { done: false, done_by: null, done_at: null } : { done: true, done_by: memberId, done_at: nowIso() })

  return (
    <div className="px-4 pt-safe pb-tabbar max-w-lg mx-auto">
      <header className="flex items-center gap-2 pt-2">
        <Link to="/listes" aria-label="Retour aux listes" className="press size-11 grid place-items-center rounded-full bg-surface shadow-soft shrink-0">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-2xl font-semibold flex-1 leading-tight">
          <span aria-hidden>{list?.emoji} </span>
          {list?.title}
        </h1>
        <button onClick={() => setConfirmDelete(true)} aria-label="Supprimer la liste" className="press size-11 grid place-items-center rounded-full text-ink-soft">
          <Trash2 size={20} />
        </button>
      </header>

      <Card className="mt-3 !p-4 flex items-center gap-4">
        <div className="relative size-16 shrink-0" aria-label={`${stats.done} sur ${stats.total} faits`}>
          <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-2)" strokeWidth="5" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--sage)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${stats.progress * 97.4} 97.4`} className="transition-all" />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-display font-semibold">{Math.round(stats.progress * 100)}%</span>
        </div>
        <div className="flex-1">
          <p className="font-bold">
            {stats.done}/{stats.total} faits
          </p>
          {stats.budget > 0 && (
            <p className="text-sm text-ink-soft">
              Budget ≈ <strong className="text-ink">{euros(stats.budget)}</strong> · reste {euros(stats.remaining)}
            </p>
          )}
        </div>
      </Card>

      <form onSubmit={add} className="flex gap-2 mt-4">
        <label htmlFor="new-item" className="sr-only">
          Ajouter un élément
        </label>
        <input
          id="new-item"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ajouter un élément…"
          className="flex-1 min-h-13 rounded-2xl bg-surface shadow-soft px-4 border-2 border-transparent focus:border-primary focus:outline-none"
        />
        <button aria-label="Ajouter" className="press size-13 rounded-2xl bg-primary text-primary-ink grid place-items-center shadow-soft">
          <Plus size={24} />
        </button>
      </form>

      <div className="mt-3">
        <Segmented<Filter>
          label="Filtrer"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tout' },
            { value: 'todo', label: 'À faire' },
            { value: 'mine', label: 'Pour moi' },
          ]}
        />
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {sorted.map((i) => {
          const assignee = byId(i.assignee)
          const doneBy = byId(i.done_by)
          const late = !i.done && i.due_date && i.due_date < today()
          return (
            <li key={i.id} className={`flex items-center gap-2 rounded-3xl bg-surface shadow-soft pr-3 ${i.done ? 'opacity-60' : ''}`}>
              <button
                onClick={() => void toggle(i)}
                aria-label={i.done ? `Décocher ${i.label}` : `Cocher ${i.label}`}
                aria-pressed={i.done}
                className="press size-14 shrink-0 grid place-items-center"
              >
                <span
                  className={`size-8 rounded-full grid place-items-center border-[3px] transition-all ${i.done ? 'bg-sage border-sage text-white animate-pop' : 'border-line'}`}
                  style={i.done && doneBy ? { background: doneBy.color, borderColor: doneBy.color } : undefined}
                >
                  {i.done && <Check size={18} strokeWidth={3.5} />}
                </span>
              </button>
              <button onClick={() => setEditing(i)} className="flex-1 min-w-0 text-left py-3">
                <span className={`block font-semibold leading-snug ${i.done ? 'line-through' : ''}`}>{i.label}</span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft mt-0.5">
                  {i.due_date && (
                    <span className={`inline-flex items-center gap-1 ${late ? 'text-danger font-bold' : ''}`}>
                      <CalendarClock size={13} aria-hidden />
                      {new Date(i.due_date + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  {i.budget_cents ? <span>{euros(i.budget_cents)}</span> : null}
                  {i.note && <StickyNote size={13} aria-label="Note" />}
                  {i.done && doneBy && <span>fait par {doneBy.first_name}</span>}
                </span>
              </button>
              {assignee && <Avatar emoji={assignee.avatar} color={assignee.color} size={30} label={`Pour ${assignee.first_name}`} />}
            </li>
          )
        })}
        {items && sorted.length === 0 && <li className="text-center text-ink-soft py-8">Rien par ici ✨</li>}
      </ul>

      <ItemSheet item={editing} onClose={() => setEditing(null)} onDelete={async (it) => { await remove('checklist_items', it.id); setEditing(null); toast('Supprimé') }} />

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Supprimer la liste ?">
        <p className="text-ink-soft mb-4">La liste et ses éléments disparaîtront des deux téléphones.</p>
        <Button
          variant="danger"
          block
          onClick={async () => {
            for (const it of items ?? []) await remove('checklist_items', it.id)
            if (list) await remove('checklists', list.id)
            navigate('/listes')
          }}
        >
          Oui, supprimer
        </Button>
      </Sheet>
    </div>
  )
}

/** Édition d'un élément : libellé, responsable, échéance, budget, note. */
function ItemSheet({ item, onClose, onDelete }: { item: Item | null; onClose: () => void; onDelete: (i: Item) => void }) {
  const { patch } = useStore()
  const [draft, setDraft] = useState<Partial<Item> & { budgetText?: string }>({})
  const [lastId, setLastId] = useState<string | null>(null)
  if (item && item.id !== lastId) {
    setLastId(item.id)
    setDraft({ label: item.label, assignee: item.assignee ?? null, due_date: item.due_date ?? '', note: item.note ?? '', budgetText: item.budget_cents != null ? String(item.budget_cents / 100).replace('.', ',') : '' })
  }
  if (!item) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    await patch('checklist_items', item!.id, {
      label: (draft.label ?? '').trim() || item!.label,
      assignee: draft.assignee ?? null,
      due_date: draft.due_date || null,
      note: draft.note || null,
      budget_cents: parseBudget(draft.budgetText),
    })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title="Détails">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Élément" value={draft.label ?? ''} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        <MemberPicker label="Qui s’en occupe ?" value={draft.assignee} onChange={(v) => setDraft({ ...draft, assignee: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Échéance" type="date" value={draft.due_date ?? ''} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} />
          <Field
            label="Budget (€)"
            inputMode="decimal"
            value={draft.budgetText ?? ''}
            onChange={(e) => setDraft({ ...draft, budgetText: e.target.value })}
            placeholder="0"
          />
        </div>
        <TextArea label="Note" value={draft.note ?? ''} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Taille, magasin, lien…" />
        <Button type="submit" block>
          Enregistrer
        </Button>
        <Button type="button" variant="danger" block icon={<Trash2 size={18} />} onClick={() => onDelete(item)}>
          Supprimer l’élément
        </Button>
      </form>
    </Sheet>
  )
}

function parseBudget(t: string | undefined): number | null {
  const v = parseFloat((t ?? '').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) : null
}
