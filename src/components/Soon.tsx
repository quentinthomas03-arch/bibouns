import { Biboun } from './Biboun'
import { soon } from '@/content/fr'

export function Soon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="px-5 pt-safe pb-tabbar">
      <h1 className="text-3xl font-semibold mt-4">{title}</h1>
      <div className="mt-16 flex flex-col items-center text-center gap-3">
        <Biboun size={140} className="animate-float" />
        <p className="font-display text-2xl">{soon.title}</p>
        <p className="text-ink-soft max-w-xs">{soon.text}</p>
        <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-bold">{phase}</span>
      </div>
    </div>
  )
}
