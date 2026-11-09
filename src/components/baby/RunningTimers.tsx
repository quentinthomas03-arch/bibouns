import { Square, Repeat } from 'lucide-react'
import { useBabyActions, useBabyEvents } from '@/app/baby'
import { useMembers } from '@/app/members'
import { useNow } from '@/app/useNow'
import { usePhase } from '@/app/phase'
import { formatTime, running } from '@/lib/baby'

const pad = (n: number) => String(n).padStart(2, '0')
function elapsed(from: string, now: Date) {
  const s = Math.max(0, Math.floor((now.getTime() - Date.parse(from)) / 1000))
  const h = Math.floor(s / 3600)
  return h ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}

/** Tétée / sommeil en cours, visibles sur les deux téléphones, arrêtables en 1 tap. */
export function RunningTimers() {
  const events = useBabyEvents()
  const { stop, start } = useBabyActions()
  const { byId } = useMembers()
  const now = useNow(1000)
  const { baby } = usePhase()
  const name = (baby?.first_name as string) || 'Biboun'
  const feed = running(events, 'feed')
  const sleep = running(events, 'sleep')
  if (!feed && !sleep) return null
  return (
    <div className="flex flex-col gap-2">
      {feed && (
        <div className="rounded-3xl bg-primary-soft p-4 flex items-center gap-3 animate-pop" role="timer" aria-live="off">
          <span className="text-3xl" aria-hidden>
            🤱
          </span>
          <div className="flex-1">
            <p className="font-bold leading-tight">Tétée {feed.data.side === 'L' ? 'G' : 'D'}</p>
            <p className="text-sm text-ink-soft">
              depuis {formatTime(feed.started_at)}
              {byId(feed.created_by) ? ` · ${byId(feed.created_by)!.first_name}` : ''}
            </p>
          </div>
          <span className="font-display text-2xl tabular-nums">{elapsed(feed.started_at, now)}</span>
          <button
            aria-label="Changer de côté"
            onClick={async () => {
              await stop(feed)
              await start('feed', { mode: 'breast', side: feed.data.side === 'L' ? 'R' : 'L' })
            }}
            className="press size-12 rounded-2xl bg-surface grid place-items-center"
          >
            <Repeat size={20} />
          </button>
          <button aria-label="Arrêter la tétée" onClick={() => stop(feed)} className="press size-12 rounded-2xl bg-primary text-primary-ink grid place-items-center">
            <Square size={20} fill="currentColor" />
          </button>
        </div>
      )}
      {sleep && (
        <div className="rounded-3xl bg-surface-2 p-4 flex items-center gap-3 animate-pop" role="timer" aria-live="off">
          <span className="text-3xl" aria-hidden>
            😴
          </span>
          <div className="flex-1">
            <p className="font-bold leading-tight">{name} dort</p>
            <p className="text-sm text-ink-soft">depuis {formatTime(sleep.started_at)}</p>
          </div>
          <span className="font-display text-2xl tabular-nums">{elapsed(sleep.started_at, now)}</span>
          <button aria-label="Réveil : arrêter le sommeil" onClick={() => stop(sleep)} className="press min-h-12 px-3 rounded-2xl bg-ink text-bg font-bold">
            ☀️ Réveil
          </button>
        </div>
      )}
    </div>
  )
}
