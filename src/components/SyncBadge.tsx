import { Cloud, CloudOff, RefreshCw, TriangleAlert } from 'lucide-react'
import { useSession } from '@/app/session'
import { sync as t } from '@/content/fr'

/** Petit indicateur de synchro : discret quand tout va bien. */
export function SyncBadge() {
  const { sync, ctx } = useSession()
  if (!sync) return null
  const { state, pending } = sync
  const map = {
    idle: { icon: <Cloud size={16} />, text: t.idle, cls: 'text-ink-soft' },
    syncing: { icon: <RefreshCw size={16} className="animate-spin" />, text: t.syncing, cls: 'text-ink-soft' },
    offline: { icon: <CloudOff size={16} />, text: t.offline, cls: 'text-ink bg-mustard/30' },
    error: { icon: <TriangleAlert size={16} />, text: t.error, cls: 'text-danger bg-danger/10' },
  } as const
  const s = map[state]
  return (
    <button
      onClick={() => void ctx?.engine.syncNow()}
      className={`press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${s.cls}`}
      aria-label={`${s.text}${pending ? `, ${t.pending(pending)}` : ''}. Toucher pour synchroniser.`}
    >
      {s.icon}
      <span className={state === 'idle' && !pending ? 'sr-only' : ''}>
        {state === 'idle' ? t.idle : s.text}
        {pending > 0 && ` · ${t.pending(pending)}`}
      </span>
    </button>
  )
}
