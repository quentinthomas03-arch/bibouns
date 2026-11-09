import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'
import { useMembers } from '@/app/members'
import { useRows, useStore, stableId } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'
import { needsSupport } from '@/lib/parents'
import { MOODS } from '@/content/pregnancy'
import { ENERGY, FEELINGS, MOM_CARE, PAIN, PARENTS_INTRO, SUPPORT } from '@/content/parents'

interface Checkin extends BaseRow {
  entry_date: string
  mood?: number | null
  energy?: number | null
  pain?: number | null
  feelings: string[]
  note?: string | null
}

const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const chip = (on: boolean) => `press min-h-11 px-3 rounded-full text-sm font-semibold ${on ? 'bg-ink text-bg' : 'bg-surface-2'}`

/** Onglet « Nous » : comment vont les parents ? */
export function ParentsTab() {
  const all = (useRows<Checkin>('parent_checkins') ?? []).sort((a, b) => b.entry_date.localeCompare(a.entry_date))
  const { me, members, byId } = useMembers()
  const { save, memberId } = useStore()
  const toast = useToast()
  const today = localToday()
  const mine = all.find((c) => c.created_by === memberId && c.entry_date === today)
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [pain, setPain] = useState<number | null>(null)
  const [feelings, setFeelings] = useState<string[]>([])
  const [note, setNote] = useState('')

  useEffect(() => {
    setMood(mine?.mood ?? null)
    setEnergy(mine?.energy ?? null)
    setPain(mine?.pain ?? null)
    setFeelings(mine?.feelings ?? [])
    setNote(mine?.note ?? '')
  }, [mine?.id, mine?.updated_at]) // eslint-disable-line react-hooks/exhaustive-deps

  const worried = members.filter((m) => needsSupport(all, m.id, today))

  async function submit() {
    if (!mood) return toast('Choisis au moins ton humeur 🙂')
    await save('parent_checkins', { id: stableId(memberId, 'checkin', today), entry_date: today, mood, energy, pain, feelings, note: note.trim() || null })
    toast('Merci, prends soin de toi 💛')
  }

  return (
    <section className="mt-4 flex flex-col gap-4">
      <p className="text-sm text-ink-soft px-1">{PARENTS_INTRO}</p>

      {worried.length > 0 && (
        <div role="note" className="rounded-3xl bg-plum/30 border-2 border-plum/50 p-4">
          <p className="font-bold">💛 {SUPPORT.alertTitle} {worried.length === 1 ? `pour ${worried[0].id === memberId ? 'toi' : worried[0].first_name}` : 'pour vous deux'}</p>
          <p className="text-sm mt-1">{SUPPORT.alert}</p>
          <p className="text-sm mt-1 font-semibold">Idées noires : 3114 (gratuit, 24 h/24). Urgence : 15.</p>
        </div>
      )}

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold">
          {me?.first_name ? `Et toi ${me.first_name}, aujourd’hui ?` : 'Et toi, aujourd’hui ?'}
        </h2>
        <fieldset>
          <legend className="font-bold mb-1.5">Humeur</legend>
          <div className="flex justify-between gap-1">
            {MOODS.map((m) => (
              <button key={m.value} type="button" aria-pressed={mood === m.value} aria-label={m.label} onClick={() => setMood(m.value)} className={`press flex-1 aspect-square max-w-16 rounded-2xl text-3xl grid place-items-center ${mood === m.value ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-2'}`}>
                {m.emoji}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-bold mb-1.5">Énergie</legend>
          <div className="flex flex-wrap gap-1.5">
            {ENERGY.map((x) => (
              <button key={x.value} type="button" aria-pressed={energy === x.value} onClick={() => setEnergy(energy === x.value ? null : x.value)} className={chip(energy === x.value)}>
                {x.emoji} {x.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-bold mb-1.5">Douleurs (facultatif)</legend>
          <div className="flex flex-wrap gap-1.5">
            {PAIN.map((x) => (
              <button key={x.value} type="button" aria-pressed={pain === x.value} onClick={() => setPain(pain === x.value ? null : x.value)} className={chip(pain === x.value)}>
                {x.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-bold mb-1.5">Comment je me sens</legend>
          <div className="flex flex-wrap gap-1.5">
            {FEELINGS.map((f) => (
              <button key={f} type="button" aria-pressed={feelings.includes(f)} onClick={() => setFeelings(feelings.includes(f) ? feelings.filter((x) => x !== f) : [...feelings, f])} className={chip(feelings.includes(f))}>
                {f}
              </button>
            ))}
          </div>
        </fieldset>
        <label htmlFor="checkin-note" className="sr-only">
          Un mot
        </label>
        <textarea id="checkin-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Un mot, un besoin (dormir ! un câlin, de l’aide…)" className="w-full rounded-2xl bg-surface-2 px-4 py-3 border-2 border-transparent focus:border-primary focus:outline-none resize-none" />
        <Button block onClick={submit}>
          {mine ? 'Mettre à jour mon point du jour' : 'Enregistrer mon point du jour'}
        </Button>
      </Card>

      <Card className="!p-4">
        <h2 className="font-display text-xl font-semibold mb-2">Les 14 derniers jours</h2>
        {all.length === 0 ? (
          <p className="text-ink-soft text-sm">Pas encore de point.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {all.slice(0, 28).map((c) => {
              const who = byId(c.created_by)
              const m = MOODS.find((x) => x.value === c.mood)
              const en = ENERGY.find((x) => x.value === c.energy)
              return (
                <li key={c.id} className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3">
                  {who && <Avatar emoji={who.avatar} color={who.color} size={30} label={who.first_name} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">
                      {new Date(c.entry_date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {m?.emoji} {en ? en.emoji : ''}
                    </p>
                    {c.feelings.length > 0 && <p className="text-sm">{c.feelings.join(' · ')}</p>}
                    {c.note && <p className="text-sm italic">« {c.note} »</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card className="!p-4 bg-surface-2">
        <h2 className="font-display text-xl font-semibold mb-1">🤱 Pour maman</h2>
        <ul className="list-disc pl-5 text-sm flex flex-col gap-1">
          {MOM_CARE.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </Card>
      <details className="rounded-3xl bg-surface p-4 shadow-soft">
        <summary className="font-bold min-h-8 cursor-pointer">💛 {SUPPORT.title}</summary>
        <ul className="list-disc pl-5 mt-2 text-sm flex flex-col gap-1">
          {SUPPORT.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </details>
    </section>
  )
}
