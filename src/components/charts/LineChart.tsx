import { useMemo } from 'react'

export interface Series {
  label: string
  color: string
  points: { x: number; y: number }[] // x = timestamp ms
}

/**
 * Courbe SVG légère (pas de librairie) : axes min/max, points, dernière valeur.
 * Lisible en clair comme en sombre (couleurs via variables CSS).
 */
export function LineChart({ series, unit, height = 180 }: { series: Series[]; unit: string; height?: number }) {
  const W = 340
  const H = height
  const pad = { l: 36, r: 12, t: 12, b: 24 }
  const all = series.flatMap((s) => s.points)
  const { minX, maxX, minY, maxY } = useMemo(() => {
    const xs = all.map((p) => p.x)
    const ys = all.map((p) => p.y)
    const lo = Math.min(...ys)
    const hi = Math.max(...ys)
    const span = Math.max(hi - lo, 2)
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.floor(lo - span * 0.15), maxY: Math.ceil(hi + span * 0.15) }
  }, [all])
  if (all.length === 0) return null
  const sx = (x: number) => pad.l + (maxX === minX ? (W - pad.l - pad.r) / 2 : ((x - minX) / (maxX - minX)) * (W - pad.l - pad.r))
  const sy = (y: number) => pad.t + (1 - (y - minY) / (maxY - minY)) * (H - pad.t - pad.b)
  const fmtDate = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const summary = series.map((s) => `${s.label} : dernière valeur ${s.points.at(-1)?.y ?? '–'} ${unit}`).join(', ')

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={summary}>
        {[minY, (minY + maxY) / 2, maxY].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={sy(v)} y2={sy(v)} stroke="var(--line)" strokeDasharray="3 4" />
            <text x={pad.l - 6} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-soft)">
              {v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
            </text>
          </g>
        ))}
        <text x={pad.l} y={H - 6} fontSize="11" fill="var(--ink-soft)">
          {fmtDate(minX)}
        </text>
        {maxX !== minX && (
          <text x={W - pad.r} y={H - 6} fontSize="11" textAnchor="end" fill="var(--ink-soft)">
            {fmtDate(maxX)}
          </text>
        )}
        {series.map((s) => {
          const pts = [...s.points].sort((a, b) => a.x - b.x)
          return (
            <g key={s.label}>
              <polyline points={pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p) => (
                <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r="4" fill="var(--surface)" stroke={s.color} strokeWidth="2.5" />
              ))}
            </g>
          )
        })}
      </svg>
      {series.length > 1 && (
        <figcaption className="flex gap-4 justify-center text-sm text-ink-soft">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-full" style={{ background: s.color }} /> {s.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  )
}
