import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { datedMilestones, formatRange } from '@/lib/milestones'

const KIND_EMOJI = { medical: '🩺', admin: '📄', prep: '🧺' } as const

/** Les 3 prochaines échéances (en cours ou à venir). */
export function NextMilestones({ dueDate, bornAt }: { dueDate: string; bornAt: string | null }) {
  const next = datedMilestones(dueDate, bornAt)
    .filter((m) => m.status === 'now' || m.status === 'soon')
    .slice(0, 3)
  if (next.length === 0) return null
  return (
    <Card className="mt-4">
      <Link to="/suivi?tab=echeances" className="press flex items-center justify-between mb-2">
        <h2 className="font-display text-xl font-semibold">📅 À venir</h2>
        <ChevronRight className="text-ink-soft" />
      </Link>
      <ul className="flex flex-col gap-2">
        {next.map((m) => (
          <li key={m.id} className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden>
              {KIND_EMOJI[m.kind]}
            </span>
            <span className="flex-1">
              <span className="block font-bold leading-tight">{m.title}</span>
              <span className="block text-sm text-ink-soft">
                {m.status === 'now' ? 'En ce moment · ' : ''}
                {formatRange(m.start, m.end)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
