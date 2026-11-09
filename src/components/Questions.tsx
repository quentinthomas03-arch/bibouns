import { useState, type FormEvent } from 'react'
import { Check, HelpCircle, Plus } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'
import { useMembers } from '@/app/members'
import { useRows, useStore } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'

export type Subject = 'pregnancy' | 'baby' | 'parents'
interface Question extends BaseRow {
  subject: Subject
  text: string
  answered: boolean
  answer?: string | null
}

const WHO: Record<Subject, string> = { pregnancy: 'la sage-femme / le médecin', baby: 'le pédiatre', parents: 'le médecin' }

/** Ajout rapide d'une question (bouton +). */
export function QuestionSheet({ open, onClose, subject }: { open: boolean; onClose: () => void; subject: Subject }) {
  const { save } = useStore()
  const toast = useToast()
  const [text, setText] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    await save('questions', { subject, text: text.trim(), answered: false })
    setText('')
    toast('Question notée ❓ Elle ressortira au prochain RDV')
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Une question ?">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label htmlFor="q-text" className="font-bold px-1 -mb-2">
          À demander à {WHO[subject]}
        </label>
        <textarea id="q-text" rows={3} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="C’est normal qu’il… ?" className="w-full rounded-2xl bg-surface-2 px-4 py-3 border-2 border-transparent focus:border-primary focus:outline-none" />
        <Button type="submit" block>
          Noter la question
        </Button>
      </form>
    </Sheet>
  )
}

/** Questions en attente pour le prochain rendez-vous, cochées une fois posées. */
export function QuestionsPanel({ subject }: { subject: Subject }) {
  const all = useRows<Question>('questions', (q) => q.subject === subject, [subject]) ?? []
  const { byId } = useMembers()
  const { patch } = useStore()
  const [adding, setAdding] = useState(false)
  const [answering, setAnswering] = useState<Question | null>(null)
  const [answer, setAnswer] = useState('')
  const [showDone, setShowDone] = useState(false)
  const open = all.filter((q) => !q.answered).sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
  const done = all.filter((q) => q.answered).sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))

  return (
    <div className="rounded-3xl bg-surface-2 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="font-bold flex items-center gap-1.5">
          <HelpCircle size={18} className="text-primary" /> Questions à poser ({open.length})
        </p>
        <button aria-label="Ajouter une question" onClick={() => setAdding(true)} className="press size-10 rounded-full bg-surface grid place-items-center">
          <Plus size={20} />
        </button>
      </div>
      {open.length === 0 && <p className="text-sm text-ink-soft">Rien en attente. Notez-les au fil de l’eau avec le bouton + .</p>}
      <ul className="flex flex-col gap-1.5">
        {open.map((q) => {
          const who = byId(q.created_by)
          return (
            <li key={q.id} className="flex items-start gap-2 rounded-2xl bg-surface p-2.5">
              <button
                aria-label={`Marquer comme posée : ${q.text}`}
                onClick={() => {
                  setAnswering(q)
                  setAnswer('')
                }}
                className="press size-8 shrink-0 rounded-full border-[3px] border-line grid place-items-center"
              />
              <span className="flex-1 text-sm">{q.text}</span>
              {who && <Avatar emoji={who.avatar} color={who.color} size={24} />}
            </li>
          )
        })}
      </ul>
      {done.length > 0 && (
        <button onClick={() => setShowDone(!showDone)} className="press text-left text-sm font-bold text-ink-soft min-h-9">
          {showDone ? 'Masquer' : 'Voir'} les réponses ({done.length})
        </button>
      )}
      {showDone && (
        <ul className="flex flex-col gap-1.5">
          {done.map((q) => (
            <li key={q.id} className="rounded-2xl bg-surface p-2.5 text-sm">
              <p className="flex gap-1.5">
                <Check size={16} className="text-sage shrink-0 mt-0.5" /> <span className="line-through text-ink-soft">{q.text}</span>
              </p>
              {q.answer && <p className="mt-1 pl-6">→ {q.answer}</p>}
            </li>
          ))}
        </ul>
      )}
      <QuestionSheet open={adding} onClose={() => setAdding(false)} subject={subject} />
      <Sheet open={!!answering} onClose={() => setAnswering(null)} title="Question posée ✓">
        <div className="flex flex-col gap-4">
          <p className="font-semibold">{answering?.text}</p>
          <label htmlFor="q-answer" className="font-bold px-1 -mb-2">
            La réponse (facultatif)
          </label>
          <textarea id="q-answer" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Ce qu’on nous a répondu…" className="w-full rounded-2xl bg-surface-2 px-4 py-3 border-2 border-transparent focus:border-primary focus:outline-none" />
          <Button
            block
            onClick={async () => {
              if (answering) await patch('questions', answering.id, { answered: true, answer: answer.trim() || null })
              setAnswering(null)
            }}
          >
            Enregistrer
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
