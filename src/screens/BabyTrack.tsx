import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Biboun } from '@/components/Biboun'
import { EventSheet } from '@/components/baby/EventSheet'
import { describeEvent } from '@/components/baby/describe'
import { useBabyEvents, type BabyEventRow } from '@/app/baby'
import { useMembers } from '@/app/members'
import { useNow } from '@/app/useNow'
import { usePhase } from '@/app/phase'
import { addDays, balanceMessage, daySummary, formatDuration, formatTime, nights, NIGHT_LENGTH_MIN, shareStats, startOfDay } from '@/lib/baby'
import { BABY_EMPTY, KIND_EMOJI } from '@/content/baby'
import { ParentsTab } from '@/components/baby/ParentsTab'
import { SwipeRow } from '@/components/ui/SwipeRow'
import { useToast } from '@/components/ui/Toast'
import { useStore } from '@/sync/store'

type Tab = 'jour' | 'semaine' | 'nuits' | 'duo' | 'nous'
const TABS: [Tab, string][] = [
  ['jour', 'Jour'],
  ['semaine', 'Sem.'],
  ['nuits', 'Nuits'],
  ['duo', 'Duo'],
  ['nous', 'Nous'],
]

/** Onglet Suivi après la naissance. */
export function BabyTrack() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'jour'
  const { baby } = usePhase()
  return (
    <div className="px-4 pt-safe pb-tabbar max-w-lg mx-auto">
      <h1 className="text-3xl font-semibold pt-4">Suivi de {(baby?.first_name as string) || 'Biboun'}</h1>
      <div role="tablist" className="mt-3 flex gap-1 rounded-2xl bg-surface-2 p-1">
        {TABS.map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setParams({ tab: v }, { replace: true })} className={`press flex-1 min-h-11 rounded-xl text-sm font-bold ${tab === v ? 'bg-surface shadow-soft' : 'text-ink-soft'}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'jour' && <Day />}
      {tab === 'semaine' && <Week />}
      {tab === 'nuits' && <Nights />}
      {tab === 'duo' && <Duo />}
      {tab === 'nous' && <ParentsTab />}
    </div>
  )
}

// ------------------------------------------------------------------ jour
function Day() {
  const events = useBabyEvents()
  const { byId } = useMembers()
  const now = useNow(60_000)
  const [offset, setOffset] = useState(0)
  const [editing, setEditing] = useState<BabyEventRow | null>(null)
  const { remove, patch } = useStore()
  const toast = useToast()
  const deleteWithUndo = async (e: BabyEventRow) => {
    await remove('baby_events', e.id)
    toast(`${describeEvent(e)} supprimé`, { label: 'Annuler', run: () => patch('baby_events', e.id, { deleted_at: null }) })
  }
  const day = addDays(startOfDay(now), offset)
  const next = addDays(day, 1)
  const list = events.filter((e) => {
    const t = Date.parse(e.started_at)
    return t >= day.getTime() && t < next.getTime()
  })
  const s = daySummary(events, day, now)
  const label = offset === 0 ? 'Aujourd’hui' : offset === -1 ? 'Hier' : day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between">
        <button aria-label="Jour précédent" onClick={() => setOffset(offset - 1)} className="press size-11 grid place-items-center rounded-full bg-surface shadow-soft">
          <ChevronLeft />
        </button>
        <p className="font-display text-xl font-semibold first-letter:uppercase">{label}</p>
        <button aria-label="Jour suivant" disabled={offset >= 0} onClick={() => setOffset(offset + 1)} className="press size-11 grid place-items-center rounded-full bg-surface shadow-soft disabled:opacity-30">
          <ChevronRight />
        </button>
      </div>
      <Card className="mt-3 !p-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <p>
          🍼 <strong>{s.feeds}</strong> repas{s.bottleMl ? ` · ${s.bottleMl} ml` : ''}
        </p>
        <p>
          🤱 <strong>{s.breastFeeds}</strong> tétée{s.breastFeeds > 1 ? 's' : ''}
          {s.breastMinutes ? ` · ${formatDuration(s.breastMinutes)}` : ''}
        </p>
        <p>
          🧷 <strong>{s.diapers}</strong> couche{s.diapers > 1 ? 's' : ''} · {s.pees}💧 {s.poos}💩
        </p>
        <p>
          😴 <strong>{s.sleepMinutes ? formatDuration(s.sleepMinutes) : '—'}</strong> de sommeil
        </p>
      </Card>
      {list.length === 0 && (
        <div className="text-center py-8 flex flex-col items-center gap-2">
          <Biboun size={80} mood="sleepy" />
          <p className="text-ink-soft">{BABY_EMPTY}</p>
        </div>
      )}
      <ol className="mt-3 flex flex-col gap-2">
        {list.map((e) => {
          const who = byId(e.created_by)
          return (
            <li key={e.id}>
              <SwipeRow onDelete={() => deleteWithUndo(e)}>
              <button onClick={() => setEditing(e)} className="press w-full flex items-center gap-3 rounded-3xl bg-surface shadow-soft p-3 text-left">
                <span className="font-display text-lg w-14 tabular-nums">{formatTime(e.started_at)}</span>
                <span className="text-2xl" aria-hidden>
                  {e.kind === 'feed' && e.data.mode === 'breast' ? '🤱' : KIND_EMOJI[e.kind]}
                </span>
                <span className="flex-1 font-semibold leading-tight">{describeEvent(e)}</span>
                {who && <Avatar emoji={who.avatar} color={who.color} size={28} label={`Noté par ${who.first_name}`} />}
              </button>
              </SwipeRow>
            </li>
          )
        })}
      </ol>
      <EventSheet open={!!editing} kind={editing?.kind ?? 'feed'} event={editing} onClose={() => setEditing(null)} />
    </section>
  )
}

// ------------------------------------------------------------------ semaine
function Week() {
  const events = useBabyEvents()
  const now = useNow(60_000)
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(now), i - 6)), [now])
  const sums = days.map((d) => daySummary(events, d, now))
  const avg = (f: (s: (typeof sums)[number]) => number) => Math.round(sums.reduce((a, s) => a + f(s), 0) / 7)
  return (
    <section className="mt-4 flex flex-col gap-4">
      <Card>
        <h2 className="font-display text-xl font-semibold">🍼 Repas par jour</h2>
        <p className="text-sm text-ink-soft">Moyenne : {avg((s) => s.feeds)} repas{avg((s) => s.bottleMl) ? ` · ${avg((s) => s.bottleMl)} ml` : ''}</p>
        <Bars days={days} values={sums.map((s) => s.feeds)} color="var(--primary)" format={(v) => String(v)} />
      </Card>
      <Card>
        <h2 className="font-display text-xl font-semibold">😴 Sommeil par jour</h2>
        <p className="text-sm text-ink-soft">Moyenne : {formatDuration(avg((s) => s.sleepMinutes))}</p>
        <Bars days={days} values={sums.map((s) => s.sleepMinutes)} color="var(--plum)" format={(v) => (v ? `${Math.round(v / 6) / 10}h` : '0')} />
      </Card>
      <Card>
        <h2 className="font-display text-xl font-semibold">🧷 Couches par jour</h2>
        <p className="text-sm text-ink-soft">Moyenne : {avg((s) => s.diapers)} couches</p>
        <Bars days={days} values={sums.map((s) => s.diapers)} color="var(--mustard)" format={(v) => String(v)} />
      </Card>
      <p className="text-xs text-ink-soft px-1">Repères pour vous, pas des normes : chaque bébé a son rythme. Au moindre doute, demandez au pédiatre ou à la sage-femme.</p>
    </section>
  )
}

function Bars({ days, values, color, format }: { days: Date[]; values: number[]; color: string; format: (v: number) => string }) {
  const max = Math.max(1, ...values)
  return (
    <div className="mt-3 flex items-end gap-2 h-36" role="img" aria-label={days.map((d, i) => `${d.toLocaleDateString('fr-FR', { weekday: 'long' })} : ${format(values[i])}`).join(', ')}>
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <span className="text-xs font-bold">{format(v)}</span>
          <div className="w-full rounded-t-xl rounded-b-md transition-all" style={{ height: `${Math.max(4, (v / max) * 100)}%`, background: color, opacity: i === values.length - 1 ? 1 : 0.65 }} />
          <span className="text-xs text-ink-soft font-semibold">{days[i].toLocaleDateString('fr-FR', { weekday: 'narrow' })}</span>
        </div>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ nuits
function Nights() {
  const events = useBabyEvents()
  const now = useNow(60_000)
  const list = nights(events, 7, now)
  const hours = [19, 21, 23, 1, 3, 5, 7]
  return (
    <section className="mt-4">
      <Card>
        <h2 className="font-display text-xl font-semibold">🌙 Les 7 dernières nuits</h2>
        <p className="text-sm text-ink-soft">De 19 h à 7 h. Chaque barre = un temps de sommeil.</p>
        <div className="mt-4 flex text-[0.7rem] text-ink-soft font-semibold pl-14">
          {hours.map((h, i) => (
            <span key={h} className="flex-1" style={{ textAlign: i === hours.length - 1 ? 'right' : 'left' }}>
              {h}h
            </span>
          ))}
        </div>
        <ol className="mt-1 flex flex-col gap-2">
          {list.map((n) => (
            <li key={n.date.toISOString()} className="flex items-center gap-2">
              <span className="w-12 text-xs font-bold text-ink-soft">{n.date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</span>
              <div className="relative flex-1 h-7 rounded-full bg-surface-2 overflow-hidden" aria-label={`Nuit du ${n.date.toLocaleDateString('fr-FR')} : ${formatDuration(n.sleepMinutes)} de sommeil, ${n.wakeUps} réveil(s)`}>
                {n.segments.map((s, i) => (
                  <span key={i} className="absolute top-1 bottom-1 rounded-full bg-plum" style={{ left: `${(s.from / NIGHT_LENGTH_MIN) * 100}%`, width: `${Math.max(1, ((s.to - s.from) / NIGHT_LENGTH_MIN) * 100)}%` }} />
                ))}
              </div>
            </li>
          ))}
        </ol>
      </Card>
      <ul className="mt-3 flex flex-col gap-2">
        {[...list].reverse().map((n) => (
          <li key={n.date.toISOString()} className="flex justify-between rounded-2xl bg-surface px-4 py-2 text-sm shadow-soft">
            <span className="font-semibold first-letter:uppercase">Nuit du {n.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}</span>
            <span className="text-ink-soft">
              {n.sleepMinutes ? formatDuration(n.sleepMinutes) : '—'} · {n.wakeUps} réveil{n.wakeUps > 1 ? 's' : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ------------------------------------------------------------------ duo
function Duo() {
  const events = useBabyEvents()
  const { members } = useMembers()
  const now = useNow(60_000)
  const [range, setRange] = useState<7 | 30>(7)
  const since = addDays(startOfDay(now), -(range - 1))
  const stats = shareStats(events, members.map((m) => m.id), since)
  const names = Object.fromEntries(members.map((m) => [m.id, m.first_name]))
  const total = stats.reduce((s, x) => s + x.total, 0) || 1
  const nightTotal = stats.reduce((s, x) => s + x.nightActions, 0) || 1

  const bar = (label: string, get: (s: (typeof stats)[number]) => number, sum: number) => (
    <div>
      <p className="text-sm font-bold mb-1">{label}</p>
      <div className="flex h-9 rounded-full overflow-hidden bg-surface-2">
        {stats.map((s) => {
          const m = members.find((x) => x.id === s.memberId)!
          const v = get(s)
          if (!v) return null
          return (
            <span key={s.memberId} className="grid place-items-center text-xs font-bold text-ink transition-all" style={{ width: `${(v / sum) * 100}%`, background: m.color }}>
              {m.avatar} {v}
            </span>
          )
        })}
      </div>
    </div>
  )

  return (
    <section className="mt-4 flex flex-col gap-4">
      <div className="flex gap-2">
        {([7, 30] as const).map((r) => (
          <button key={r} aria-pressed={range === r} onClick={() => setRange(r)} className={`press flex-1 min-h-11 rounded-full font-bold ${range === r ? 'bg-ink text-bg' : 'bg-surface'}`}>
            {r} derniers jours
          </button>
        ))}
      </div>
      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold">🤝 Qui fait quoi</h2>
        {bar('Tous les soins (repas, couches, soins)', (s) => s.total, total)}
        {bar('🍼 Repas', (s) => s.feeds, stats.reduce((a, s) => a + s.feeds, 0) || 1)}
        {bar('🧷 Couches', (s) => s.diapers, stats.reduce((a, s) => a + s.diapers, 0) || 1)}
        {bar('🌙 La nuit (22 h – 6 h)', (s) => s.nightActions, nightTotal)}
        <p className="rounded-2xl bg-primary-soft p-3 font-semibold">{balanceMessage(stats, names)}</p>
      </Card>
      <p className="text-xs text-ink-soft px-1">
        Compté d’après qui a noté chaque saisie dans l’appli : ce n’est qu’un reflet, pas un concours. Les tâches invisibles (lessives, rendez-vous, câlins…) comptent aussi 💛
      </p>
    </section>
  )
}
