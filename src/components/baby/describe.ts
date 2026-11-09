import { formatDuration, minutesBetween, type BabyEvent } from '@/lib/baby'
import { DIAPER_COLORS } from '@/content/baby'

/** Phrase courte décrivant un événement ("Biberon 120 ml", "Tétée gauche · 14 min"…). */
export function describeEvent(e: BabyEvent): string {
  switch (e.kind) {
    case 'feed':
      if (e.data.mode === 'bottle') return `Biberon${e.data.ml ? ` ${e.data.ml} ml` : ''}${e.data.milk === 'maternel' ? ' (lait maternel)' : ''}`
      return `Tétée ${e.data.side === 'R' ? 'droite' : 'gauche'}${e.ended_at ? ` · ${formatDuration(minutesBetween(e.started_at, e.ended_at))}` : ' · en cours'}`
    case 'diaper': {
      const what = e.data.pee && e.data.poo ? 'Pipi + caca' : e.data.poo ? 'Caca' : 'Pipi'
      const color = DIAPER_COLORS.find((c) => c.key === e.data.color)?.label
      return [what, color, e.data.texture].filter(Boolean).join(' · ')
    }
    case 'sleep':
      return e.ended_at ? `Sommeil · ${formatDuration(minutesBetween(e.started_at, e.ended_at))}` : 'Sommeil · en cours'
    case 'med':
      return e.data.name ?? 'Soin'
  }
}
