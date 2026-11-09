import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { Field } from './ui/Field'
import { usePhase } from '@/app/phase'
import { useRows, useStore } from '@/sync/store'
import { useToast } from './ui/Toast'
import { AppointmentSheet, JournalSheet, MeasureSheet } from './pregnancy/Sheets'
import { QuickBaby } from './baby/QuickBaby'
import { between, type ChecklistRow, type ItemRow } from '@/lib/checklists'
import type { BaseRow } from '@/sync/tables'
import { notes, quickActions } from '@/content/fr'
import { notifyPartner } from '@/lib/push'

type Open = null | 'rdv' | 'journal' | 'measure' | 'task'

/**
 * Ajout rapide (bouton central) : 1 tap pour choisir, 1 tap pour valider.
 * Avant la naissance : RDV, journal, mesure, tâche. Après : suivi bébé (Phase 2).
 */
export function QuickSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { phase } = usePhase()
  const { save, engine } = useStore()
  const toast = useToast()
  const [text, setText] = useState('')
  const [sub, setSub] = useState<Open>(null)
  const navigate = useNavigate()
  const contractions = useRows<BaseRow & { started_at: string; ended_at?: string | null }>('contractions') ?? []
  const runningContraction = contractions.find((c) => !c.ended_at)
  const { patch } = useStore()

  const go = (s: Open) => {
    onClose()
    setSub(s)
  }

  const actions: { label: string; emoji: string; onClick?: () => void }[] =
    phase === 'dday'
        ? [
            {
              label: runningContraction ? 'Fin de contraction' : 'Début de contraction',
              emoji: runningContraction ? '⏹️' : '⏱️',
              onClick: () => {
                void (runningContraction
                  ? patch('contractions', runningContraction.id, { ended_at: new Date().toISOString() })
                  : save('contractions', { started_at: new Date().toISOString(), ended_at: null }))
                onClose()
              },
            },
            { label: 'Appeler', emoji: '📞', onClick: () => { onClose(); navigate('/jour-j') } },
            { label: 'Valises', emoji: '🧳', onClick: () => { onClose(); navigate('/listes') } },
            { label: 'Bébé est né !', emoji: '👶', onClick: () => { onClose(); navigate('/jour-j') } },
          ]
        : [
            { label: 'Rendez-vous', emoji: '📅', onClick: () => go('rdv') },
            { label: 'Journal', emoji: '📝', onClick: () => go('journal') },
            { label: 'Mesure', emoji: '⚖️', onClick: () => go('measure') },
            { label: 'Tâche', emoji: '✅', onClick: () => go('task') },
          ]

  async function sendNote(body: string) {
    if (!body.trim()) return
    const row = await save('notes', { body: body.trim() })
    void engine.flush().then(() => notifyPartner('note', row.id))
    setText('')
    toast('Envoyé 💌')
    onClose()
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title={quickActions.title}>
        {phase === 'after' ? (
          <QuickBaby onDone={onClose} />
        ) : (
        <div className="grid grid-cols-2 gap-3">
          {actions.map((a) => (
            <button
              key={a.label}
              disabled={!a.onClick}
              onClick={a.onClick}
              className={`press rounded-3xl bg-surface p-4 min-h-24 text-left font-bold text-lg shadow-soft ${a.onClick ? '' : 'opacity-60'}`}
            >
              <span className="text-3xl block" aria-hidden>
                {a.emoji}
              </span>
              {a.label}
              {!a.onClick && <span className="block text-xs font-semibold text-ink-soft">bientôt</span>}
            </button>
          ))}
        </div>
        )}
        <form
          className="mt-5 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void sendNote(text)
          }}
        >
          <label htmlFor="quick-note" className="font-bold px-1">
            💌 {quickActions.note}
          </label>
          <div className="flex gap-2">
            <input
              id="quick-note"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={notes.placeholder}
              className="flex-1 min-h-13 rounded-2xl bg-surface-2 px-4 border-2 border-transparent focus:border-primary focus:outline-none"
            />
            <Button type="submit" size="md" className="min-h-13">
              {notes.send}
            </Button>
          </div>
        </form>
      </Sheet>
      <AppointmentSheet open={sub === 'rdv'} onClose={() => setSub(null)} />
      <JournalSheet open={sub === 'journal'} onClose={() => setSub(null)} />
      <MeasureSheet open={sub === 'measure'} onClose={() => setSub(null)} />
      <TaskSheet open={sub === 'task'} onClose={() => setSub(null)} />
    </>
  )
}

/** Ajouter une tâche dans une liste existante. */
function TaskSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lists = (useRows<BaseRow & ChecklistRow>('checklists') ?? []).sort((a, b) => a.position - b.position)
  const items = useRows<BaseRow & ItemRow>('checklist_items') ?? []
  const { save } = useStore()
  const toast = useToast()
  const [listId, setListId] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const target = listId ?? lists[0]?.id ?? null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    let id = target
    if (!id) {
      const l = await save('checklists', { title: 'À faire', kind: 'custom', emoji: '✅', position: 0 })
      id = l.id
    }
    const last = items.filter((i) => i.checklist_id === id).reduce((m, i) => Math.max(m, i.position), -1)
    await save('checklist_items', { checklist_id: id, label: label.trim(), done: false, position: between(last, undefined) })
    setLabel('')
    toast('Ajouté ✅')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nouvelle tâche">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Tâche" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Acheter des bodies 1 mois…" autoFocus />
        {lists.length > 0 && (
          <fieldset>
            <legend className="font-bold mb-1.5 px-1">Dans la liste</legend>
            <div className="flex flex-wrap gap-2">
              {lists.map((l) => (
                <button
                  type="button"
                  key={l.id}
                  aria-pressed={target === l.id}
                  onClick={() => setListId(l.id)}
                  className={`press min-h-11 px-4 rounded-full font-semibold text-sm ${target === l.id ? 'bg-ink text-bg' : 'bg-surface-2'}`}
                >
                  {l.emoji} {l.title}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <Button type="submit" block>
          Ajouter
        </Button>
      </form>
    </Sheet>
  )
}
