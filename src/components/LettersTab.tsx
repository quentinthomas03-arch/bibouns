import { useEffect, useState } from 'react'
import { Mail, MailOpen, PenLine, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'
import { useMembers } from '@/app/members'
import { usePhase } from '@/app/phase'
import { useRows, useStore } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'
import { addMonthsISO } from '@/lib/health'

interface Letter extends BaseRow {
  title?: string | null
  body: string
  written_on: string
  open_on?: string | null
}

const today = () => new Date().toISOString().slice(0, 10)
const fmt = (d: string) => new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Lettres à Biboun. Une lettre peut être « scellée » jusqu'à une date :
 * elle s'affiche fermée pour vous deux (l'auteur peut la relire).
 * Ce n'est pas un coffre-fort : c'est une enveloppe, pas un cadenas.
 */
export function LettersTab() {
  const letters = (useRows<Letter>('letters') ?? []).sort((a, b) => b.written_on.localeCompare(a.written_on))
  const { byId } = useMembers()
  const { memberId } = useStore()
  const [editing, setEditing] = useState<Partial<Letter> | null>(null)
  const [reading, setReading] = useState<Letter | null>(null)
  const t = today()

  return (
    <section className="mt-4 flex flex-col gap-3">
      <Button block icon={<PenLine size={20} />} onClick={() => setEditing({})}>
        Écrire une lettre à Biboun
      </Button>
      {letters.length === 0 && <p className="text-center text-ink-soft py-6">Ce que vous ressentez aujourd’hui, Biboun pourra le lire un jour. 💌</p>}
      {letters.map((l) => {
        const sealed = !!l.open_on && l.open_on > t
        const author = byId(l.created_by)
        return (
          <button key={l.id} onClick={() => (sealed && l.created_by !== memberId ? undefined : setReading(l))} className={`press text-left ${sealed && l.created_by !== memberId ? 'cursor-default' : ''}`}>
            <Card className={`!p-4 flex items-start gap-3 ${sealed ? 'bg-surface-2' : ''}`}>
              {sealed ? <Mail className="text-primary shrink-0 mt-1" /> : <MailOpen className="text-primary shrink-0 mt-1" />}
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg font-semibold leading-tight">{l.title || 'Lettre à Biboun'}</p>
                <p className="text-sm text-ink-soft">
                  {author?.first_name ? `De ${author.first_name}, ` : ''}le {fmt(l.written_on)}
                </p>
                {sealed ? <p className="text-sm font-bold text-primary mt-1">🔒 Scellée jusqu’au {fmt(l.open_on!)}</p> : <p className="text-sm mt-1 line-clamp-2">{l.body}</p>}
              </div>
              {author && <Avatar emoji={author.avatar} color={author.color} size={30} />}
            </Card>
          </button>
        )
      })}
      <p className="text-xs text-ink-soft px-1">Une lettre scellée s’affiche fermée jusqu’à sa date (seul son auteur peut la relire). C’est une enveloppe symbolique, pas un coffre-fort.</p>
      <LetterSheet initial={editing} onClose={() => setEditing(null)} />
      <Sheet open={!!reading} onClose={() => setReading(null)} title={reading?.title || 'Lettre à Biboun'}>
        {reading && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">
              {byId(reading.created_by)?.first_name ? `De ${byId(reading.created_by)!.first_name}, ` : ''}le {fmt(reading.written_on)}
            </p>
            <p className="whitespace-pre-line text-[1.05rem] leading-relaxed">{reading.body}</p>
            {reading.created_by === memberId && (
              <Button
                variant="soft"
                block
                onClick={() => {
                  setEditing(reading)
                  setReading(null)
                }}
              >
                Modifier
              </Button>
            )}
          </div>
        )}
      </Sheet>
    </section>
  )
}

function LetterSheet({ initial, onClose }: { initial: Partial<Letter> | null; onClose: () => void }) {
  const { save, remove } = useStore()
  const { baby, dueDate } = usePhase()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [openOn, setOpenOn] = useState<string>('')
  const birth = (baby?.born_at as string | undefined)?.slice(0, 10) ?? dueDate ?? null

  useEffect(() => {
    if (!initial) return
    setTitle(initial.title ?? '')
    setBody(initial.body ?? '')
    setOpenOn(initial.open_on ?? '')
  }, [initial])

  const presets = birth
    ? [
        { label: 'Pas scellée', value: '' },
        { label: '1er anniversaire', value: addMonthsISO(birth, 12) },
        { label: '10 ans', value: addMonthsISO(birth, 120) },
        { label: '18 ans', value: addMonthsISO(birth, 216) },
      ]
    : [{ label: 'Pas scellée', value: '' }]

  return (
    <Sheet open={!!initial} onClose={onClose} title={initial?.id ? 'Ma lettre' : 'Nouvelle lettre'}>
      <div className="flex flex-col gap-4">
        <Field label="Titre (facultatif)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Le jour où on a su…" />
        <label htmlFor="letter-body" className="font-bold px-1 -mb-2">
          Ta lettre
        </label>
        <textarea id="letter-body" rows={9} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Mon petit Biboun…" className="w-full rounded-2xl bg-surface-2 px-4 py-3 border-2 border-transparent focus:border-primary focus:outline-none text-[1.05rem] leading-relaxed" />
        <fieldset>
          <legend className="font-bold mb-1.5 px-1">Sceller jusqu’à…</legend>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button key={p.label} type="button" aria-pressed={openOn === p.value} onClick={() => setOpenOn(p.value)} className={`press min-h-11 px-4 rounded-full text-sm font-semibold ${openOn === p.value ? 'bg-ink text-bg' : 'bg-surface-2'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="Ou une date précise" type="date" value={openOn} onChange={(e) => setOpenOn(e.target.value)} />
        <Button
          block
          onClick={async () => {
            if (!body.trim()) return toast('Écris quelques mots 🙂')
            await save('letters', { id: initial?.id, title: title.trim() || null, body: body.trim(), written_on: initial?.written_on ?? today(), open_on: openOn || null })
            toast(openOn ? 'Lettre scellée 💌' : 'Lettre enregistrée 💌')
            onClose()
          }}
        >
          {openOn ? 'Sceller la lettre' : 'Enregistrer'}
        </Button>
        {initial?.id && (
          <Button variant="danger" block icon={<Trash2 size={18} />} onClick={async () => { await remove('letters', initial.id!); onClose() }}>
            Supprimer
          </Button>
        )}
      </div>
    </Sheet>
  )
}
