import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Biboun } from '@/components/Biboun'
import { useBabyEvents } from '@/app/baby'
import { useMembers } from '@/app/members'
import { useNow } from '@/app/useNow'
import { babyAge, formatBabyAge } from '@/lib/pregnancy'
import { daySummary, formatDuration, lastOf, running, timeAgo } from '@/lib/baby'
import { describeEvent } from './describe'
import { RunningTimers } from './RunningTimers'

/** Accueil "Après" : âge de bébé + dernier repas / couche / sommeil + journée. */
export function BabySummary({ name, bornAt }: { name: string; bornAt: string | null }) {
  const events = useBabyEvents()
  const { byId } = useMembers()
  const now = useNow(30_000)
  const today = daySummary(events, now, now)
  const lastFeed = lastOf(events, 'feed')
  const lastDiaper = lastOf(events, 'diaper')
  const sleeping = running(events, 'sleep')
  const lastSleep = lastOf(events, 'sleep', (e) => !!e.ended_at)

  const row = (emoji: string, label: string, value: string | null, sub?: string) => (
    <li className="flex items-center gap-3">
      <span className="text-2xl w-8 text-center" aria-hidden>
        {emoji}
      </span>
      <span className="flex-1">
        <span className="block text-sm text-ink-soft font-semibold">{label}</span>
        <span className="block font-bold leading-tight">{value ?? '—'}</span>
        {sub && <span className="block text-xs text-ink-soft">{sub}</span>}
      </span>
    </li>
  )

  return (
    <>
      <Card className="mt-4 flex items-center gap-4 bg-gradient-to-br from-primary-soft to-surface">
        <Biboun mood={sleeping ? 'sleepy' : 'love'} size={84} />
        <div>
          <p className="font-display text-3xl font-semibold leading-tight">{name}</p>
          <p className="text-ink-soft font-semibold">{bornAt ? formatBabyAge(babyAge(new Date(bornAt), now)) : 'Ajoute la date de naissance dans les réglages'}</p>
        </div>
      </Card>
      <Link to="/nuit" className="press mt-4 flex items-center justify-center gap-2 rounded-3xl bg-ink text-bg min-h-14 font-bold">
        🌙 Mode nuit
      </Link>
      <div className="mt-4">
        <RunningTimers />
      </div>
      <Card className="mt-4">
        <ul className="flex flex-col gap-3">
          {row('🍼', 'Dernier repas', lastFeed ? timeAgo(lastFeed.started_at, now) : null, lastFeed ? `${describeEvent(lastFeed)} · ${byId(lastFeed.created_by)?.first_name ?? ''}` : undefined)}
          {row('🧷', 'Dernière couche', lastDiaper ? timeAgo(lastDiaper.started_at, now) : null, lastDiaper ? describeEvent(lastDiaper) : undefined)}
          {row('😴', sleeping ? 'Dort depuis' : 'Dernier sommeil', sleeping ? formatDuration(Math.round((now.getTime() - Date.parse(sleeping.started_at)) / 60000)) : lastSleep ? `réveillé ${timeAgo(lastSleep.ended_at!, now)}` : null, !sleeping && lastSleep ? describeEvent(lastSleep) : undefined)}
        </ul>
      </Card>
      <Link to="/suivi" className="press block mt-4">
        <Card className="!p-4">
          <p className="font-bold mb-2">Aujourd’hui</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat value={today.feeds} label="repas" />
            <Stat value={today.bottleMl ? `${today.bottleMl}` : '—'} label="ml" />
            <Stat value={today.diapers} label="couches" />
            <Stat value={today.sleepMinutes ? formatDuration(today.sleepMinutes) : '—'} label="sommeil" />
          </div>
        </Card>
      </Link>
    </>
  )
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 py-2">
      <p className="font-display text-xl font-semibold leading-tight">{value}</p>
      <p className="text-xs text-ink-soft font-semibold">{label}</p>
    </div>
  )
}
