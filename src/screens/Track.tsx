import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPin, Plus, HelpCircle, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Biboun } from '@/components/Biboun'
import { BabyTrack } from './BabyTrack'
import { LineChart } from '@/components/charts/LineChart'
import { AppointmentSheet, JournalSheet, MeasureSheet, type Appointment, type JournalEntry, type Measurement } from '@/components/pregnancy/Sheets'
import { usePhase } from '@/app/phase'
import { useMembers } from '@/app/members'
import { useRows } from '@/sync/store'
import { datedMilestones, formatRange, type DatedMilestone } from '@/lib/milestones'
import { formatBP } from '@/lib/measures'
import { MILESTONES_DISCLAIMER } from '@/content/milestones'
import { JOURNAL_EMPTY, MEASURE_NOTE, MILESTONE_TO_APPOINTMENT, MOODS, kindInfo } from '@/content/pregnancy'

type Tab = 'rdv' | 'journal' | 'mesures' | 'echeances'
const TABS: { value: Tab; label: string }[] = [
  { value: 'rdv', label: 'RDV' },
  { value: 'journal', label: 'Journal' },
  { value: 'mesures', label: 'Mesures' },
  { value: 'echeances', label: 'Échéances' },
]

export function Track() {
  const { phase } = usePhase()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'rdv'
  if (phase === 'after') return <BabyTrack />

  return (
    <div className="px-4 pt-safe pb-tabbar max-w-lg mx-auto">
      <h1 className="text-3xl font-semibold pt-4">Suivi de grossesse</h1>
      <div role="tablist" className="mt-3 flex gap-1 rounded-2xl bg-surface-2 p-1 sticky top-[env(safe-area-inset-top)] z-10">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setParams({ tab: t.value }, { replace: true })}
            className={`press flex-1 min-h-11 rounded-xl text-sm font-bold ${tab === t.value ? 'bg-surface shadow-soft' : 'text-ink-soft'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'rdv' && <Appointments />}
      {tab === 'journal' && <Journal />}
      {tab === 'mesures' && <Measures />}
      {tab === 'echeances' && <Milestones />}
    </div>
  )
}

// ------------------------------------------------------------------ RDV
function Appointments() {
  const all = useRows<Appointment>('appointments', (a) => a.subject === 'pregnancy') ?? []
  const { dueDate } = usePhase()
  const [editing, setEditing] = useState<Partial<Appointment> | null>(null)
  const [showPast, setShowPast] = useState(false)
  const now = new Date().toISOString()
  const upcoming = all.filter((a) => a.starts_at >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const past = all.filter((a) => a.starts_at < now).sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  // Suggestions : échéances médicales en cours / proches sans RDV du même titre
  const suggestions = useMemo(() => {
    if (!dueDate) return []
    return datedMilestones(dueDate)
      .filter((m) => (m.status === 'now' || m.status === 'soon') && MILESTONE_TO_APPOINTMENT[m.id])
      .filter((m) => !all.some((a) => a.title === MILESTONE_TO_APPOINTMENT[m.id].title))
  }, [dueDate, all])

  return (
    <section className="mt-4">
      <Button block icon={<Plus size={20} />} onClick={() => setEditing({})}>
        Ajouter un rendez-vous
      </Button>
      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((m) => (
            <button
              key={m.id}
              onClick={() => setEditing({ ...MILESTONE_TO_APPOINTMENT[m.id] })}
              className="press rounded-full bg-primary-soft px-4 min-h-11 font-semibold text-sm"
            >
              + Planifier : {MILESTONE_TO_APPOINTMENT[m.id].title}
            </button>
          ))}
        </div>
      )}
      <ul className="mt-4 flex flex-col gap-3">
        {upcoming.length === 0 && <li className="text-center text-ink-soft py-6">Aucun rendez-vous à venir.</li>}
        {upcoming.map((a) => (
          <AppointmentCard key={a.id} a={a} onClick={() => setEditing(a)} />
        ))}
      </ul>
      {past.length > 0 && (
        <>
          <button onClick={() => setShowPast(!showPast)} className="press mt-5 flex items-center gap-1 font-bold text-ink-soft min-h-11">
            <ChevronDown size={18} className={showPast ? 'rotate-180 transition-transform' : 'transition-transform'} /> Passés ({past.length})
          </button>
          {showPast && (
            <ul className="flex flex-col gap-3 opacity-80">
              {past.map((a) => (
                <AppointmentCard key={a.id} a={a} onClick={() => setEditing(a)} />
              ))}
            </ul>
          )}
        </>
      )}
      <AppointmentSheet open={!!editing} onClose={() => setEditing(null)} initial={editing ?? undefined} />
    </section>
  )
}

function AppointmentCard({ a, onClick }: { a: Appointment; onClick: () => void }) {
  const k = kindInfo(a.kind)
  const d = new Date(a.starts_at)
  const qCount = (a.questions ?? '').split('\n').filter((l) => l.trim()).length
  return (
    <li>
      <button onClick={onClick} className="press w-full text-left">
        <Card className="!p-4 flex gap-4">
          <div className="w-14 shrink-0 rounded-2xl bg-primary-soft text-center py-2">
            <p className="text-xs font-bold uppercase">{d.toLocaleDateString('fr-FR', { month: 'short' })}</p>
            <p className="font-display text-2xl font-semibold leading-none">{d.getDate()}</p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight">
              <span aria-hidden>{k.emoji} </span>
              {a.title}
            </p>
            <p className="text-sm text-ink-soft">
              {d.toLocaleDateString('fr-FR', { weekday: 'long' })} à {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {a.location && (
              <p className="text-sm text-ink-soft flex items-center gap-1 truncate">
                <MapPin size={14} aria-hidden /> {a.location}
              </p>
            )}
            {qCount > 0 && (
              <p className="text-sm font-semibold text-primary flex items-center gap-1 mt-1">
                <HelpCircle size={14} aria-hidden /> {qCount} question{qCount > 1 ? 's' : ''} à poser
              </p>
            )}
          </div>
        </Card>
      </button>
    </li>
  )
}

// ------------------------------------------------------------------ journal
function Journal() {
  const entries = useRows<JournalEntry>('journal_entries') ?? []
  const { byId } = useMembers()
  const [editing, setEditing] = useState<JournalEntry | null | undefined>(undefined)
  const sorted = [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date) || (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  return (
    <section className="mt-4">
      <Button block icon={<Plus size={20} />} onClick={() => setEditing(null)}>
        Nouvelle entrée
      </Button>
      {sorted.length === 0 && (
        <div className="text-center py-8 flex flex-col items-center gap-2">
          <Biboun size={90} mood="love" />
          <p className="text-ink-soft max-w-xs">{JOURNAL_EMPTY}</p>
        </div>
      )}
      <ul className="mt-4 flex flex-col gap-3">
        {sorted.map((e) => {
          const author = byId(e.created_by)
          const mood = MOODS.find((m) => m.value === e.mood)
          return (
            <li key={e.id}>
              <button onClick={() => setEditing(e)} className="press w-full text-left">
                <Card className="!p-4">
                  <div className="flex items-center gap-2">
                    {author && <Avatar emoji={author.avatar} color={author.color} size={28} label={author.first_name} />}
                    <span className="text-sm font-bold text-ink-soft flex-1">
                      {new Date(e.entry_date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    {mood && (
                      <span className="text-2xl" aria-label={`Humeur : ${mood.label}`}>
                        {mood.emoji}
                      </span>
                    )}
                  </div>
                  {e.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {e.symptoms.map((s) => (
                        <span key={s} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {e.body && <p className="mt-2 whitespace-pre-line">{e.body}</p>}
                </Card>
              </button>
            </li>
          )
        })}
      </ul>
      <JournalSheet open={editing !== undefined} onClose={() => setEditing(undefined)} initial={editing ?? undefined} />
    </section>
  )
}

// ------------------------------------------------------------------ mesures
function Measures() {
  const all = useRows<Measurement>('measurements') ?? []
  const [adding, setAdding] = useState<'weight' | 'bp' | null>(null)
  const weights = all.filter((m) => m.kind === 'weight').sort((a, b) => a.measured_at.localeCompare(b.measured_at))
  const bps = all.filter((m) => m.kind === 'bp').sort((a, b) => a.measured_at.localeCompare(b.measured_at))
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <section className="mt-4 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Button variant="soft" onClick={() => setAdding('weight')}>
          ⚖️ Poids
        </Button>
        <Button variant="soft" onClick={() => setAdding('bp')}>
          💓 Tension
        </Button>
      </div>
      <Card>
        <h2 className="font-display text-xl font-semibold mb-2">⚖️ Poids</h2>
        {weights.length === 0 ? (
          <p className="text-ink-soft">Pas encore de mesure.</p>
        ) : (
          <>
            <LineChart unit="kg" series={[{ label: 'Poids', color: 'var(--primary)', points: weights.map((w) => ({ x: Date.parse(w.measured_at), y: Number(w.value) })) }]} />
            <p className="text-sm text-ink-soft mt-1">
              Dernière : <strong className="text-ink">{Number(weights.at(-1)!.value).toLocaleString('fr-FR')} kg</strong> le {fmt(weights.at(-1)!.measured_at)}
              {weights.length > 1 && ` · ${(Number(weights.at(-1)!.value) - Number(weights[0].value) >= 0 ? '+' : '')}${(Number(weights.at(-1)!.value) - Number(weights[0].value)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg depuis le ${fmt(weights[0].measured_at)}`}
            </p>
          </>
        )}
      </Card>
      <Card>
        <h2 className="font-display text-xl font-semibold mb-2">💓 Tension</h2>
        {bps.length === 0 ? (
          <p className="text-ink-soft">Pas encore de mesure.</p>
        ) : (
          <>
            <LineChart
              unit="mmHg"
              series={[
                { label: 'Systolique', color: 'var(--primary)', points: bps.map((b) => ({ x: Date.parse(b.measured_at), y: Number(b.value) })) },
                { label: 'Diastolique', color: 'var(--mustard)', points: bps.map((b) => ({ x: Date.parse(b.measured_at), y: Number(b.value2) })) },
              ]}
            />
            <p className="text-sm text-ink-soft mt-1">
              Dernière : <strong className="text-ink">{formatBP(Number(bps.at(-1)!.value), Number(bps.at(-1)!.value2))}</strong> le {fmt(bps.at(-1)!.measured_at)}
            </p>
          </>
        )}
      </Card>
      <p className="text-xs text-ink-soft px-1">{MEASURE_NOTE}</p>
      <MeasureSheet open={!!adding} onClose={() => setAdding(null)} initialKind={adding ?? 'weight'} />
    </section>
  )
}

// ------------------------------------------------------------------ échéances
const KIND = { medical: { emoji: '🩺', label: 'Médical' }, admin: { emoji: '📄', label: 'Démarche' }, prep: { emoji: '🧺', label: 'Préparation' } } as const

function Milestones() {
  const { dueDate, baby } = usePhase()
  const [showPast, setShowPast] = useState(false)
  if (!dueDate) return <p className="mt-6 text-center text-ink-soft">Ajoute la date prévue dans les réglages.</p>
  const list = datedMilestones(dueDate, (baby?.born_at as string) ?? null)
  const past = list.filter((m) => m.status === 'past')
  const rest = list.filter((m) => m.status !== 'past')
  return (
    <section className="mt-4">
      <div role="note" className="rounded-3xl bg-mustard/25 border-2 border-mustard/50 p-4 text-sm">
        <strong>⚠️ À vérifier.</strong> {MILESTONES_DISCLAIMER}
      </div>
      <ol className="mt-4 flex flex-col gap-3">
        {rest.map((m) => (
          <MilestoneRow key={m.id} m={m} />
        ))}
      </ol>
      {past.length > 0 && (
        <>
          <button onClick={() => setShowPast(!showPast)} className="press mt-5 flex items-center gap-1 font-bold text-ink-soft min-h-11">
            <ChevronDown size={18} className={showPast ? 'rotate-180' : ''} /> Passées ({past.length})
          </button>
          {showPast && (
            <ol className="flex flex-col gap-3 opacity-70">
              {past.map((m) => (
                <MilestoneRow key={m.id} m={m} />
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  )
}

function MilestoneRow({ m }: { m: DatedMilestone }) {
  const k = KIND[m.kind]
  return (
    <li className={`rounded-3xl p-4 shadow-soft ${m.status === 'now' ? 'bg-primary-soft' : 'bg-surface'}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {k.emoji}
        </span>
        <div className="flex-1">
          <p className="font-bold leading-tight">{m.title}</p>
          <p className="text-sm font-semibold text-ink-soft">
            {m.status === 'now' && <span className="text-primary">En ce moment · </span>}
            {m.status === 'soon' && <span className="text-primary">Bientôt · </span>}
            {formatRange(m.start, m.end)}
          </p>
          <p className="text-sm mt-1">{m.detail}</p>
          {m.check && <p className="text-xs text-ink-soft mt-1">À vérifier : {m.check}</p>}
        </div>
      </div>
    </li>
  )
}
