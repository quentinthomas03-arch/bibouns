import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Copy, Share2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useMembers } from '@/app/members'
import { usePhase } from '@/app/phase'
import { useSetting, useStore } from '@/sync/store'
import { BIRTHPLAN, BIRTHPLAN_INTRO, EMPTY_PLAN, birthPlanText, type BirthPlanValue } from '@/content/birthplan'

/** Projet de naissance rempli à deux, partagé en texte avec la maternité. */
export function BirthPlan() {
  const saved = useSetting<BirthPlanValue>('birth_plan', EMPTY_PLAN)
  const { setSetting } = useStore()
  const { me, partner } = useMembers()
  const { dueDate } = usePhase()
  const toast = useToast()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState('')
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current && Object.keys(notes).length) return
    setNotes(saved.notes ?? {})
    setGeneral(saved.general ?? '')
    loaded.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved])

  const plan = { ...EMPTY_PLAN, ...saved }
  const toggle = (key: string, opt: string) => {
    const cur = plan.choices[key] ?? []
    void setSetting('birth_plan', { ...plan, choices: { ...plan.choices, [key]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] } })
  }
  const saveNotes = () => setSetting('birth_plan', { ...plan, notes, general })
  const parents = [me?.first_name, partner?.first_name].filter(Boolean).join(' & ')
  const text = birthPlanText({ ...plan, notes, general }, parents, dueDate)
  const filled = BIRTHPLAN.filter((s) => (plan.choices[s.key] ?? []).length || notes[s.key]?.trim()).length

  return (
    <div className="px-4 pt-safe pb-tabbar max-w-lg mx-auto">
      <header className="flex items-center gap-2 pt-2">
        <Link to="/plus" aria-label="Retour" className="press size-11 grid place-items-center rounded-full bg-surface shadow-soft">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-3xl font-semibold flex-1">Projet de naissance</h1>
      </header>
      <p className="mt-3 rounded-3xl bg-surface-2 p-4 text-sm">{BIRTHPLAN_INTRO}</p>
      <p className="mt-3 text-sm font-semibold text-ink-soft px-1">
        {filled}/{BIRTHPLAN.length} rubriques remplies · modifiable à deux, en temps réel
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {BIRTHPLAN.map((s) => (
          <Card key={s.key} className="!p-4 flex flex-col gap-3">
            <h2 className="font-display text-xl font-semibold">
              <span aria-hidden>{s.emoji}</span> {s.title}
            </h2>
            <div className="flex flex-wrap gap-2">
              {s.options.map((o) => {
                const on = (plan.choices[s.key] ?? []).includes(o)
                return (
                  <button key={o} type="button" aria-pressed={on} onClick={() => toggle(s.key, o)} className={`press min-h-11 px-4 rounded-full text-sm font-semibold ${on ? 'bg-ink text-bg' : 'bg-surface-2'}`}>
                    {o}
                  </button>
                )
              })}
            </div>
            <label className="sr-only" htmlFor={`note-${s.key}`}>
              Précision pour {s.title}
            </label>
            <input
              id={`note-${s.key}`}
              value={notes[s.key] ?? ''}
              onChange={(e) => setNotes({ ...notes, [s.key]: e.target.value })}
              onBlur={saveNotes}
              placeholder="Une précision ? (facultatif)"
              className="w-full min-h-12 rounded-2xl bg-surface-2 px-4 border-2 border-transparent focus:border-primary focus:outline-none"
            />
          </Card>
        ))}
        <Card className="!p-4 flex flex-col gap-2">
          <label htmlFor="bp-general" className="font-display text-xl font-semibold">
            💬 Un mot pour l’équipe
          </label>
          <textarea id="bp-general" rows={3} value={general} onChange={(e) => setGeneral(e.target.value)} onBlur={saveNotes} placeholder="Nos peurs, ce qui nous rassure, ce qui compte pour nous…" className="w-full rounded-2xl bg-surface-2 px-4 py-3 border-2 border-transparent focus:border-primary focus:outline-none resize-none" />
        </Card>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <Button
          block
          icon={<Share2 size={20} />}
          onClick={async () => {
            await saveNotes()
            if (navigator.share) await navigator.share({ title: 'Projet de naissance', text }).catch(() => undefined)
            else await navigator.clipboard?.writeText(text).then(() => toast('Texte copié'))
          }}
        >
          Envoyer à la sage-femme / maternité
        </Button>
        <Button variant="soft" block icon={<Copy size={18} />} onClick={() => navigator.clipboard?.writeText(text).then(() => toast('Texte copié'))}>
          Copier le texte
        </Button>
      </div>
      <details className="mt-4 rounded-3xl bg-surface p-4 shadow-soft">
        <summary className="font-bold min-h-8 cursor-pointer">Aperçu du texte</summary>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{text}</pre>
      </details>
    </div>
  )
}
