import { curve, PERCENTILE_LINES, type GrowthKey, type Sex } from '@/lib/growth'

interface Point {
  days: number
  value: number
}

/**
 * Courbe OMS : zone 15e-85e percentile, lignes 3e/50e/97e, mesures de bébé.
 * L'axe horizontal s'adapte à l'âge (au moins 3 mois, jusqu'à 24 mois).
 */
export function GrowthChart({ kind, sex, points, unit }: { kind: GrowthKey; sex: Sex; points: Point[]; unit: string }) {
  const lastAge = points.reduce((m, p) => Math.max(m, p.days), 0)
  const maxDays = Math.min(728, Math.max(91, Math.ceil((lastAge + 60) / 7) * 7))
  const lines = Object.fromEntries(PERCENTILE_LINES.map((l) => [l.p, curve(kind, sex, l.z, maxDays)]))
  const ys = [...lines[3].map((p) => p.value), ...lines[97].map((p) => p.value), ...points.map((p) => p.value)]
  const minY = Math.floor(Math.min(...ys))
  const maxY = Math.ceil(Math.max(...ys))
  const W = 340
  const H = 220
  const pad = { l: 34, r: 10, t: 10, b: 26 }
  const sx = (d: number) => pad.l + (d / maxDays) * (W - pad.l - pad.r)
  const sy = (v: number) => pad.t + (1 - (v - minY) / (maxY - minY)) * (H - pad.t - pad.b)
  const path = (pts: Point[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.days).toFixed(1)},${sy(p.value).toFixed(1)}`).join(' ')
  const band = `${path(lines[15])} ${[...lines[85]].reverse().map((p) => `L${sx(p.days).toFixed(1)},${sy(p.value).toFixed(1)}`).join(' ')} Z`
  const monthsMax = Math.round(maxDays / 30.44)
  const tickStep = monthsMax > 12 ? 3 : monthsMax > 6 ? 2 : 1
  const yStep = maxY - minY > 20 ? 5 : maxY - minY > 8 ? 2 : 1
  const sorted = [...points].sort((a, b) => a.days - b.days)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Courbe ${unit} : ${points.length} mesure(s) sur les courbes OMS`}>
      {Array.from({ length: Math.floor((maxY - minY) / yStep) + 1 }, (_, i) => minY + i * yStep).map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={sy(v)} y2={sy(v)} stroke="var(--line)" strokeWidth="0.6" />
          <text x={pad.l - 5} y={sy(v) + 3.5} textAnchor="end" fontSize="10" fill="var(--ink-soft)">
            {v}
          </text>
        </g>
      ))}
      {Array.from({ length: Math.floor(monthsMax / tickStep) + 1 }, (_, i) => i * tickStep).map((m) => (
        <text key={m} x={Math.min(sx(m * 30.44), W - pad.r)} y={H - 8} textAnchor={sx(m * 30.44) > W - pad.r - 12 ? 'end' : 'middle'} fontSize="10" fill="var(--ink-soft)">
          {m === 0 ? 'naiss.' : `${m}m`}
        </text>
      ))}
      <path d={band} fill="var(--sage)" opacity="0.28" />
      {[3, 97].map((p) => (
        <path key={p} d={path(lines[p])} fill="none" stroke="var(--sage)" strokeWidth="1.2" strokeDasharray="4 3" />
      ))}
      <path d={path(lines[50])} fill="none" stroke="var(--sage)" strokeWidth="2" />
      {sorted.length > 1 && <path d={path(sorted)} fill="none" stroke="var(--primary)" strokeWidth="2.5" />}
      {sorted.map((p) => (
        <circle key={p.days + '-' + p.value} cx={sx(p.days)} cy={sy(p.value)} r="4.5" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.5" />
      ))}
      <text x={W - pad.r} y={sy(lines[97].at(-1)!.value) - 4} textAnchor="end" fontSize="9" fill="var(--ink-soft)">
        97e
      </text>
      <text x={W - pad.r} y={sy(lines[50].at(-1)!.value) - 4} textAnchor="end" fontSize="9" fill="var(--ink-soft)">
        50e
      </text>
      <text x={W - pad.r} y={sy(lines[3].at(-1)!.value) + 11} textAnchor="end" fontSize="9" fill="var(--ink-soft)">
        3e
      </text>
    </svg>
  )
}
