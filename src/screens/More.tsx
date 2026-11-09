import { Link } from 'react-router-dom'
import { Heart, Rocket, Stethoscope, Camera, Settings } from 'lucide-react'
import type { ReactNode } from 'react'

const items: Array<{ to: string; label: string; icon: ReactNode; color: string; soon?: string }> = [
  { to: '/prenoms', label: 'Prénoms', icon: <Heart />, color: 'bg-rose' },
  { to: '/jour-j', label: 'Jour J', icon: <Rocket />, color: 'bg-apricot', soon: 'Phase 3' },
  { to: '/sante', label: 'Carnet de santé', icon: <Stethoscope />, color: 'bg-sage' },
  { to: '/souvenirs', label: 'Souvenirs', icon: <Camera />, color: 'bg-plum', soon: 'Phase 3' },
  { to: '/reglages', label: 'Réglages', icon: <Settings />, color: 'bg-surface-2' },
]

export function More() {
  return (
    <div className="px-4 pt-safe pb-tabbar max-w-lg mx-auto">
      <h1 className="text-3xl font-semibold pt-4">Plus</h1>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {items.map((i) => (
          <Link key={i.to} to={i.to} className={`press rounded-[var(--radius-blob)] ${i.color} p-4 min-h-32 flex flex-col justify-between shadow-soft text-ink`}>
            <span className="size-12 rounded-2xl bg-surface/70 grid place-items-center">{i.icon}</span>
            <span>
              <span className="block font-display text-xl font-semibold">{i.label}</span>
              {i.soon && <span className="text-xs font-bold opacity-80">{i.soon}</span>}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
