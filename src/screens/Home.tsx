import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Send, Settings as SettingsIcon } from 'lucide-react'
import { Biboun } from '@/components/Biboun'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { SyncBadge } from '@/components/SyncBadge'
import { useMembers } from '@/app/members'
import { usePhase } from '@/app/phase'
import { useRows, useStore } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'
import { formatSA, pregnancyProgress } from '@/lib/pregnancy'
import type { Phase } from '@/lib/phase'
import { WeekCard } from '@/components/home/WeekCard'
import { NextMilestones } from '@/components/home/NextMilestones'
import { BabySummary } from '@/components/baby/BabySummary'
import { ContractionTimer } from '@/screens/DayJ'
import { notifyPartner } from '@/lib/push'
import { countdown, greetings, notes as tn, phases, settings as ts } from '@/content/fr'

function greeting(name: string) {
  const h = new Date().getHours()
  const list = h < 6 ? greetings.night : h < 12 ? greetings.morning : h < 18 ? greetings.afternoon : h < 23 ? greetings.evening : greetings.night
  const pick = list[new Date().getDate() % list.length]
  return pick.replace('{name}', name)
}

export function Home() {
  const { me, partner } = useMembers()
  const { phase, dueDate, manual, baby } = usePhase()
  const { setSetting } = useStore()

  return (
    <div className="px-4 pt-safe pb-tabbar max-w-lg mx-auto">
      <header className="flex items-center gap-3 pt-2">
        <div className="flex -space-x-2">
          {me && <Avatar emoji={me.avatar} color={me.color} size={44} ring label={me.first_name} />}
          {partner && <Avatar emoji={partner.avatar} color={partner.color} size={44} ring label={partner.first_name} />}
        </div>
        <h1 className="text-2xl font-semibold flex-1 leading-tight">{me ? greeting(me.first_name) : '…'}</h1>
        <SyncBadge />
        <Link to="/reglages" aria-label={ts.title} className="press size-11 grid place-items-center rounded-full bg-surface shadow-soft">
          <SettingsIcon size={22} />
        </Link>
      </header>

      <PhaseSwitch phase={phase} manual={manual} onChange={(p) => void setSetting('phase_manual', p)} />

      {phase === 'before' && <Countdown dueDate={dueDate} />}
      {phase === 'before' && dueDate && <WeekCard p={pregnancyProgress(dueDate)} />}
      {phase === 'before' && dueDate && pregnancyProgress(dueDate).weeks >= 34 && (
        <Link to="/jour-j" className="press mt-4 flex items-center gap-3 rounded-3xl bg-apricot/60 p-4 shadow-soft">
          <span className="text-3xl" aria-hidden>
            🧳
          </span>
          <span className="flex-1 font-bold">Prépare le mode Jour J : maternité, contacts, documents</span>
        </Link>
      )}
      {phase === 'dday' && (
        <>
          <ContractionTimer compact />
          <Link to="/jour-j" className="press mt-3 block rounded-3xl bg-primary text-primary-ink p-4 text-center font-bold text-lg shadow-soft">
            🚀 Ouvrir le mode Jour J (appels, trajet, valise, naissance)
          </Link>
        </>
      )}
      {phase === 'after' && <BabySummary name={(baby?.first_name as string) || 'Biboun'} bornAt={(baby?.born_at as string) ?? null} />}
      {phase !== 'dday' && dueDate && <NextMilestones dueDate={dueDate} bornAt={(baby?.born_at as string) ?? null} />}

      {!partner && <InviteCard />}
      <LoveNotes />
    </div>
  )
}

function PhaseSwitch({ phase, manual, onChange }: { phase: Phase; manual: Phase | null; onChange: (p: Phase | null) => void }) {
  const order: Phase[] = ['before', 'dday', 'after']
  return (
    <div className="mt-4">
      <div role="radiogroup" aria-label="Phase de l'appli" className="flex gap-2">
        {order.map((p) => (
          <button
            key={p}
            role="radio"
            aria-checked={phase === p}
            onClick={() => onChange(p)}
            className={`press flex-1 min-h-11 rounded-full font-bold text-sm transition-colors ${phase === p ? 'bg-ink text-bg' : 'bg-surface text-ink-soft'}`}
          >
            <span aria-hidden>{phases[p].emoji}</span> {phases[p].label}
          </button>
        ))}
      </div>
      {manual && (
        <button onClick={() => onChange(null)} className="press mt-1 w-full text-center text-sm text-ink-soft underline min-h-9">
          Phase choisie à la main · revenir en automatique
        </button>
      )}
    </div>
  )
}

function Countdown({ dueDate }: { dueDate: string | null }) {
  const p = useMemo(() => (dueDate ? pregnancyProgress(dueDate) : null), [dueDate])
  if (!p) {
    return (
      <Card className="mt-4 flex items-center gap-4">
        <Biboun size={80} />
        <p className="flex-1">
          {countdown.noDueDate}{' '}
          <Link to="/reglages" className="font-bold text-primary underline">
            Réglages
          </Link>
        </p>
      </Card>
    )
  }
  return (
    <Card className="mt-4 overflow-hidden relative bg-gradient-to-br from-primary-soft via-surface to-surface-2">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="font-display text-6xl font-semibold text-primary leading-none animate-pop">{countdown.daysLeft(p.daysLeft)}</p>
          <p className="text-ink-soft mt-1 font-semibold">{countdown.daysLeftLong(p.daysLeft)}</p>
        </div>
        <Biboun size={84} className="animate-float -mt-2" />
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <Chip>{formatSA(p)}</Chip>
        <Chip>{countdown.week(p.currentWeek)}</Chip>
        <Chip>{countdown.month(p.month)}</Chip>
        <Chip>{countdown.trimester(p.trimester)}</Chip>
      </div>
      <div className="mt-5" aria-label={`Progression : ${Math.round(p.progress * 100)} %`}>
        <div className="h-4 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-apricot to-primary transition-all" style={{ width: `${Math.max(4, p.progress * 100)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-ink-soft mt-1 font-semibold">
          <span>0 SA</span>
          <span>{new Date(dueDate + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
        </div>
      </div>
    </Card>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-surface px-3 py-1.5 text-sm font-bold shadow-soft">{children}</span>
}

function InviteCard() {
  const households = useRows<BaseRow & { invite_code?: string | null; invite_expires_at?: string | null }>('households') ?? []
  const h = households[0]
  return (
    <Card className="mt-4 flex items-center gap-4 bg-surface-2">
      <Biboun size={64} mood="sleepy" />
      <div className="flex-1">
        <p className="font-bold">{ts.waitingPartner}</p>
        {h?.invite_code ? (
          <p className="text-sm text-ink-soft">
            Code à donner : <span className="font-display text-lg text-primary tracking-widest">{h.invite_code}</span>
          </p>
        ) : (
          <Link to="/reglages" className="text-sm font-bold text-primary underline">
            {ts.newInvite}
          </Link>
        )}
      </div>
    </Card>
  )
}

interface Note extends BaseRow {
  body: string
  emoji?: string | null
}

export function LoveNotes() {
  const all = useRows<Note>('notes')
  const { byId } = useMembers()
  const { save, ...ctx } = useStore()
  const [text, setText] = useState('')
  const list = useMemo(() => [...(all ?? [])].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, 6), [all])

  async function send(body: string, e?: FormEvent) {
    e?.preventDefault()
    if (!body.trim()) return
    setText('')
    const row = await save('notes', { body: body.trim() })
    // laisse le temps à la note d'arriver sur le serveur avant de prévenir
    void ctx.engine.flush().then(() => notifyPartner('note', row.id))
  }

  return (
    <section className="mt-6" aria-labelledby="notes-title">
      <h2 id="notes-title" className="font-display text-xl font-semibold px-1 mb-2">
        💌 {tn.title}
      </h2>
      <form onSubmit={(e) => send(text, e)} className="flex gap-2">
        <label className="sr-only" htmlFor="note-input">
          {tn.placeholder}
        </label>
        <input
          id="note-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder={tn.placeholder}
          className="flex-1 min-h-13 rounded-2xl bg-surface shadow-soft px-4 border-2 border-transparent focus:border-primary focus:outline-none"
        />
        <button aria-label={tn.send} className="press size-13 shrink-0 rounded-2xl bg-primary text-primary-ink grid place-items-center shadow-soft">
          <Send size={22} />
        </button>
      </form>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2 -mx-4 px-4">
        {tn.quick.map((q) => (
          <button key={q} onClick={() => send(q)} className="press shrink-0 rounded-full bg-surface-2 px-3 min-h-10 text-sm font-semibold">
            {q}
          </button>
        ))}
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {list.length === 0 && <li className="text-ink-soft text-center py-4">{tn.empty}</li>}
        {list.map((n) => {
          const author = byId(n.created_by)
          return (
            <li key={n.id} className="animate-pop flex items-start gap-3 rounded-3xl bg-surface p-3 shadow-soft">
              {author && <Avatar emoji={author.avatar} color={author.color} size={36} label={author.first_name} />}
              <div className="flex-1 min-w-0">
                <p className="break-words">{n.body}</p>
                <p className="text-xs text-ink-soft mt-0.5">
                  {author?.first_name ?? '…'} · {new Date(n.created_at ?? n.updated_at).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
