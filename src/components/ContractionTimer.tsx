import { useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useNow } from '@/app/useNow'
import { useRows, useStore, nowIso } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'
import { contractionStats, formatSec, type Contraction } from '@/lib/contractions'
import { RULE_STATE, RULE_TEXT, RULE_TITLE } from '@/content/dday'

type ContractionRow = BaseRow & Contraction

export function ContractionTimer({ compact = false }: { compact?: boolean }) {
  const rows = useRows<ContractionRow>('contractions') ?? []
  const { save, patch, remove } = useStore()
  const now = useNow(1000)
  const list = useMemo(() => [...rows].sort((a, b) => a.started_at.localeCompare(b.started_at)), [rows])
  const current = list.find((c) => !c.ended_at)
  const stats = contractionStats(list, now)
  const st = RULE_STATE[stats.state]
  const elapsed = current ? Math.floor((now.getTime() - Date.parse(current.started_at)) / 1000) : 0
  const recent = [...list].reverse().slice(0, compact ? 3 : 8)

  return (
    <section className="mt-4">
      <Card className="flex flex-col gap-4">
        <button
          onClick={() => (current ? patch('contractions', current.id, { ended_at: nowIso() }) : save('contractions', { started_at: nowIso(), ended_at: null }))}
          className={`press w-full rounded-[2rem] min-h-32 font-display text-3xl font-semibold shadow-soft ${current ? 'bg-ink text-bg' : 'bg-primary text-primary-ink'}`}
          aria-live="polite"
        >
          {current ? (
            <>
              ⏹️ Fin <span className="block text-xl tabular-nums">{formatSec(elapsed)}</span>
            </>
          ) : (
            '⏱️ Début de contraction'
          )}
        </button>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat value={stats.avgIntervalMin !== null ? `${stats.avgIntervalMin.toLocaleString('fr-FR')} min` : '—'} label="intervalle moyen" />
          <Stat value={stats.avgDurationSec !== null ? formatSec(stats.avgDurationSec) : '—'} label="durée moyenne" />
          <Stat value={String(stats.lastHourCount)} label="sur 1 heure" />
        </div>
        <div className={`rounded-3xl p-4 ${stats.state === 'reached' ? 'bg-primary text-primary-ink' : stats.state === 'close' ? 'bg-mustard/30' : 'bg-surface-2'}`} role="status">
          <p className="font-bold text-lg">
            {st.emoji} {st.text}
          </p>
          {stats.sustainedMin > 0 && <p className="text-sm mt-1">Rythme ≤ 6 min depuis {stats.sustainedMin} min{stats.regular ? ', régulier' : ', encore irrégulier'}.</p>}
        </div>
        {!compact && (
          <details className="text-sm">
            <summary className="font-bold min-h-8 cursor-pointer">{RULE_TITLE}</summary>
            <p className="mt-1 text-ink-soft">{RULE_TEXT}</p>
          </details>
        )}
        {recent.length > 0 && (
          <ol className="flex flex-col gap-1 text-sm">
            {recent.map((c) => {
              const idx = list.indexOf(c)
              const prev = list[idx - 1]
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 min-h-11">
                  <span className="font-bold tabular-nums w-12">{new Date(c.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="flex-1">{c.ended_at ? `dure ${formatSec((Date.parse(c.ended_at) - Date.parse(c.started_at)) / 1000)}` : 'en cours…'}</span>
                  {prev && <span className="text-ink-soft">+{Math.round((Date.parse(c.started_at) - Date.parse(prev.started_at)) / 6000) / 10} min</span>}
                  {!compact && (
                    <button aria-label="Supprimer cette contraction" onClick={() => remove('contractions', c.id)} className="press size-9 grid place-items-center text-ink-soft">
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </Card>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 py-2 px-1">
      <p className="font-display text-lg font-semibold leading-tight">{value}</p>
      <p className="text-[0.7rem] text-ink-soft font-semibold leading-tight">{label}</p>
    </div>
  )
}

