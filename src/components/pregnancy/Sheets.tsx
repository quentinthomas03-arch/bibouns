import { useEffect, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field, TextArea } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/Toast'
import { useStore } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'
import { APPOINTMENT_KINDS, MOODS, REMINDER_OPTIONS, SYMPTOMS } from '@/content/pregnancy'
import { parseBloodPressure, parseWeight } from '@/lib/measures'

// ------------------------------------------------------------------ types
export interface Appointment extends BaseRow {
  subject: 'pregnancy' | 'baby'
  kind: string
  title: string
  starts_at: string
  location?: string | null
  notes?: string | null
  questions?: string | null
  remind_minutes: number[]
  done: boolean
}
export interface JournalEntry extends BaseRow {
  entry_date: string
  mood?: number | null
  symptoms: string[]
  body?: string | null
}
export interface Measurement extends BaseRow {
  kind: 'weight' | 'bp'
  measured_at: string
  value: number
  value2?: number | null
}

const pad = (n: number) => String(n).padStart(2, '0')
/** ISO → valeur pour <input type="datetime-local"> (heure locale) */
export const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const localToday = () => toLocalInput(new Date().toISOString()).slice(0, 10)

function Chips<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T | T[]; onChange: (v: T) => void; label: string }) {
  const isOn = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v)
  return (
    <fieldset>
      <legend className="font-bold mb-1.5 px-1">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={String(o.value)}
            aria-pressed={isOn(o.value)}
            onClick={() => onChange(o.value)}
            className={`press min-h-11 px-4 rounded-full font-semibold ${isOn(o.value) ? 'bg-ink text-bg' : 'bg-surface-2'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

// ------------------------------------------------------------------ rendez-vous
export interface AppointmentDraft {
  id?: string
  kind?: string
  title?: string
  starts_at?: string
}

export function AppointmentSheet({ open, onClose, initial, subject = 'pregnancy' }: { open: boolean; onClose: () => void; initial?: Partial<Appointment> & AppointmentDraft; subject?: 'pregnancy' | 'baby' }) {
  const { save, remove } = useStore()
  const toast = useToast()
  const [kind, setKind] = useState('consultation')
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState('')
  const [location, setLocation] = useState('')
  const [questions, setQuestions] = useState('')
  const [notes, setNotes] = useState('')
  const [remind, setRemind] = useState(1440)

  useEffect(() => {
    if (!open) return
    setKind(initial?.kind ?? 'consultation')
    setTitle(initial?.title ?? '')
    setWhen(initial?.starts_at ? toLocalInput(initial.starts_at) : '')
    setLocation(initial?.location ?? '')
    setQuestions(initial?.questions ?? '')
    setNotes(initial?.notes ?? '')
    setRemind(initial?.remind_minutes?.[0] ?? 1440)
  }, [open, initial])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!when) return
    const k = APPOINTMENT_KINDS.find((x) => x.key === kind)!
    await save('appointments', {
      id: initial?.id,
      subject: initial?.subject ?? subject,
      kind,
      title: title.trim() || k.label,
      starts_at: new Date(when).toISOString(),
      location: location.trim() || null,
      questions: questions.trim() || null,
      notes: notes.trim() || null,
      remind_minutes: remind ? [remind] : [],
      done: initial?.done ?? false,
    })
    toast('Rendez-vous enregistré 📅')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial?.id ? 'Rendez-vous' : 'Nouveau rendez-vous'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Chips label="Type" value={kind} onChange={setKind} options={APPOINTMENT_KINDS.map((k) => ({ value: k.key, label: `${k.emoji} ${k.label}` }))} />
        <Field label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={APPOINTMENT_KINDS.find((k) => k.key === kind)?.label} />
        <Field label="Date et heure" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
        <Field label="Lieu" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Cabinet, maternité…" />
        <TextArea label="Questions à poser" value={questions} onChange={(e) => setQuestions(e.target.value)} placeholder="Une question par ligne" />
        <TextArea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ce qui a été dit, résultats…" />
        <div>
          <Segmented label="Rappel" value={String(remind)} onChange={(v) => setRemind(Number(v))} options={REMINDER_OPTIONS.map((r) => ({ value: String(r.minutes), label: r.label }))} />
          <p className="text-xs text-ink-soft mt-1 px-1">Les notifications arrivent en Phase 3 : le rappel est déjà mémorisé.</p>
        </div>
        <Button type="submit" block>
          Enregistrer
        </Button>
        {initial?.id && (
          <Button type="button" variant="danger" block icon={<Trash2 size={18} />} onClick={async () => { await remove('appointments', initial.id!); onClose() }}>
            Supprimer
          </Button>
        )}
      </form>
    </Sheet>
  )
}

// ------------------------------------------------------------------ journal
export function JournalSheet({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: JournalEntry }) {
  const { save, remove } = useStore()
  const toast = useToast()
  const [date, setDate] = useState(localToday())
  const [mood, setMood] = useState<number | null>(null)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [body, setBody] = useState('')

  useEffect(() => {
    if (!open) return
    setDate(initial?.entry_date ?? localToday())
    setMood(initial?.mood ?? null)
    setSymptoms(initial?.symptoms ?? [])
    setBody(initial?.body ?? '')
  }, [open, initial])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!mood && symptoms.length === 0 && !body.trim()) return
    await save('journal_entries', { id: initial?.id, entry_date: date, mood, symptoms, body: body.trim() || null })
    toast('Noté dans le journal 📝')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Journal">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <fieldset>
          <legend className="font-bold mb-1.5 px-1">Humeur du jour</legend>
          <div className="flex justify-between gap-1">
            {MOODS.map((m) => (
              <button
                type="button"
                key={m.value}
                aria-pressed={mood === m.value}
                aria-label={m.label}
                onClick={() => setMood(mood === m.value ? null : m.value)}
                className={`press flex-1 aspect-square max-w-16 rounded-2xl text-3xl grid place-items-center ${mood === m.value ? 'bg-primary-soft ring-2 ring-primary scale-105' : 'bg-surface-2'}`}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </fieldset>
        <Chips label="Symptômes / ressentis" value={symptoms} onChange={(s) => setSymptoms(symptoms.includes(s) ? symptoms.filter((x) => x !== s) : [...symptoms, s])} options={SYMPTOMS.map((s) => ({ value: s, label: s }))} />
        <TextArea label="Notes" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Une envie de fraises à 23 h, un coup de pied…" />
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button type="submit" block>
          Enregistrer
        </Button>
        {initial?.id && (
          <Button type="button" variant="danger" block icon={<Trash2 size={18} />} onClick={async () => { await remove('journal_entries', initial.id); onClose() }}>
            Supprimer
          </Button>
        )}
      </form>
    </Sheet>
  )
}

// ------------------------------------------------------------------ mesures
export function MeasureSheet({ open, onClose, initialKind = 'weight' }: { open: boolean; onClose: () => void; initialKind?: 'weight' | 'bp' }) {
  const { save } = useStore()
  const toast = useToast()
  const [kind, setKind] = useState<'weight' | 'bp'>(initialKind)
  const [text, setText] = useState('')
  const [when, setWhen] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setKind(initialKind)
    setText('')
    setError(null)
    setWhen(toLocalInput(new Date().toISOString()))
  }, [open, initialKind])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const measured_at = new Date(when).toISOString()
    if (kind === 'weight') {
      const v = parseWeight(text)
      if (v === null) return setError('Poids en kg, par exemple 64,5')
      await save('measurements', { kind, measured_at, value: v, value2: null })
    } else {
      const bp = parseBloodPressure(text)
      if (!bp) return setError('Tension sous la forme 12/8 ou 120/80')
      await save('measurements', { kind, measured_at, value: bp.sys, value2: bp.dia })
    }
    toast('Mesure enregistrée ✓')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nouvelle mesure">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Segmented<'weight' | 'bp'>
          label="Type de mesure"
          value={kind}
          onChange={(k) => {
            setKind(k)
            setError(null)
          }}
          options={[
            { value: 'weight', label: '⚖️ Poids' },
            { value: 'bp', label: '💓 Tension' },
          ]}
        />
        <Field
          label={kind === 'weight' ? 'Poids (kg)' : 'Tension (ex. 12/8)'}
          inputMode={kind === 'weight' ? 'decimal' : 'text'}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          placeholder={kind === 'weight' ? '64,5' : '12/8'}
          autoFocus
          className="[&_input]:text-2xl [&_input]:font-display"
        />
        {error && (
          <p role="alert" className="text-danger font-semibold px-1">
            {error}
          </p>
        )}
        <Field label="Quand" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <Button type="submit" block>
          Enregistrer
        </Button>
      </form>
    </Sheet>
  )
}
