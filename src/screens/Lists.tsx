import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { Biboun } from '@/components/Biboun'
import { useRows, useStore, stableId } from '@/sync/store'
import { usePhase } from '@/app/phase'
import { CHECKLIST_TEMPLATES, euros, listStats, templateRows, type ChecklistRow, type ItemRow } from '@/lib/checklists'
import type { BaseRow } from '@/sync/tables'

type List = BaseRow & ChecklistRow
type Item = BaseRow & ItemRow

/** Onglet Listes : toutes les checklists partagées. */
export function Lists() {
  const lists = useRows<List>('checklists')
  const items = useRows<Item>('checklist_items') ?? []
  const { save, householdId } = useStore()
  const { dueDate } = usePhase()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  const sorted = useMemo(() => [...(lists ?? [])].sort((a, b) => a.position - b.position), [lists])
  const missing = CHECKLIST_TEMPLATES.filter((t) => !sorted.some((l) => l.kind === t.key))

  async function addTemplates(keys: string[]) {
    setBusy(true)
    let pos = sorted.length ? sorted[sorted.length - 1].position + 1 : 0
    for (const tpl of CHECKLIST_TEMPLATES.filter((t) => keys.includes(t.key))) {
      const { list, items } = templateRows(tpl, (...p) => stableId(householdId, ...p), dueDate, pos++)
      await save('checklists', list)
      for (const it of items) await save('checklist_items', it)
    }
    setBusy(false)
  }

  async function createList() {
    if (!title.trim()) return
    const pos = sorted.length ? sorted[sorted.length - 1].position + 1 : 0
    await save('checklists', { title: title.trim(), kind: 'custom', emoji: '📝', position: pos })
    setTitle('')
    setCreating(false)
  }

  return (
    <div className="px-4 pt-safe pb-tabbar max-w-lg mx-auto">
      <header className="flex items-center justify-between pt-4">
        <h1 className="text-3xl font-semibold">Listes</h1>
        <Button size="md" variant="soft" icon={<Plus size={20} />} onClick={() => setCreating(true)}>
          Nouvelle
        </Button>
      </header>

      {lists && sorted.length === 0 && (
        <Card className="mt-6 text-center flex flex-col items-center gap-3">
          <Biboun size={100} mood="wow" />
          <p className="font-display text-2xl">On s’organise ?</p>
          <p className="text-ink-soft">Valises, achats, chambre, démarches : des listes toutes prêtes, modifiables à volonté.</p>
          <Button block loading={busy} icon={<Sparkles size={20} />} onClick={() => addTemplates(missing.map((t) => t.key))}>
            Ajouter les 6 listes modèles
          </Button>
        </Card>
      )}

      <div className="flex flex-col gap-3 mt-4">
        {sorted.map((l) => {
          const s = listStats(items.filter((i) => i.checklist_id === l.id))
          return (
            <Link key={l.id} to={`/listes/${l.id}`} className="press">
              <Card className="flex items-center gap-4 !p-4">
                <span className="text-4xl" aria-hidden>
                  {l.emoji ?? '📝'}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-lg leading-tight truncate">{l.title}</span>
                  <span className="block text-sm text-ink-soft">
                    {s.done}/{s.total} fait{s.done > 1 ? 's' : ''}
                    {s.budget > 0 && ` · budget ≈ ${euros(s.budget)}`}
                  </span>
                  <span className="mt-2 block h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden>
                    <span className="block h-full rounded-full bg-sage transition-all" style={{ width: `${s.progress * 100}%` }} />
                  </span>
                </span>
                {s.total > 0 && s.done === s.total && <span aria-label="Liste terminée">🎉</span>}
              </Card>
            </Link>
          )
        })}
      </div>

      {sorted.length > 0 && missing.length > 0 && (
        <div className="mt-6">
          <p className="font-bold text-ink-soft px-1 mb-2">Modèles disponibles</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((t) => (
              <button key={t.key} disabled={busy} onClick={() => addTemplates([t.key])} className="press rounded-full bg-surface shadow-soft px-4 min-h-11 font-semibold">
                + {t.emoji} {t.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <Sheet open={creating} onClose={() => setCreating(false)} title="Nouvelle liste">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void createList()
          }}
        >
          <Field label="Nom de la liste" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cadeaux de naissance, idées sorties…" autoFocus />
          <Button type="submit" block>
            Créer
          </Button>
        </form>
      </Sheet>
    </div>
  )
}
