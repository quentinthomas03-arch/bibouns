import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { formatLength, formatWeight, tipsFor, weekInfo } from '@/content/weeks'
import type { PregnancyProgress } from '@/lib/pregnancy'

/** "Biboun a la taille d'une pomme" + conseils côté maman / côté papa. */
export function WeekCard({ p }: { p: PregnancyProgress }) {
  const info = weekInfo(p.weeks)
  const tips = tipsFor(p.weeks)
  const [side, setSide] = useState<'maman' | 'papa'>('maman')
  if (!info) return null
  return (
    <Card className="mt-4">
      <div className="flex items-center gap-4">
        <span className="text-6xl animate-wiggle" aria-hidden>
          {info.emoji}
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-ink-soft">Cette semaine, Biboun a la taille d’…</p>
          <p className="font-display text-2xl font-semibold leading-tight">{info.fruit}</p>
          <p className="text-sm text-ink-soft font-semibold">
            {formatLength(info.cm)} · {formatWeight(info.g)}
          </p>
        </div>
      </div>
      <p className="mt-3 italic">« {info.line} »</p>
      {tips && (
        <div className="mt-4 rounded-3xl bg-surface-2 p-3">
          <div role="tablist" aria-label="Conseil de la période" className="flex gap-1 mb-2">
            {(['maman', 'papa'] as const).map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={side === s}
                onClick={() => setSide(s)}
                className={`press flex-1 min-h-10 rounded-full text-sm font-bold ${side === s ? 'bg-surface shadow-soft' : 'text-ink-soft'}`}
              >
                {s === 'maman' ? '🤰 Côté maman' : '🧔 Côté papa'}
              </button>
            ))}
          </div>
          <p className="text-[0.95rem]">{tips[side]}</p>
        </div>
      )}
      <p className="text-xs text-ink-soft mt-3">Tailles moyennes indicatives : chaque bébé grandit à son rythme.</p>
    </Card>
  )
}
