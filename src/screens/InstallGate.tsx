import { Share } from 'lucide-react'
import { Biboun } from '@/components/Biboun'
import { install as t } from '@/content/fr'

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/**
 * Sur iPhone, Safari et l'appli installée ont des stockages SÉPARÉS : si on
 * crée le foyer dans Safari, l'appli installée ne le connaîtra pas.
 * On demande donc d'installer avant de commencer.
 */
export function InstallGate({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="min-h-dvh px-6 pt-safe pb-safe max-w-lg mx-auto flex flex-col justify-center gap-6">
      <Biboun size={120} className="mx-auto animate-float" />
      <h1 className="text-3xl font-semibold text-center">{t.title}</h1>
      <p className="text-ink-soft text-center">{t.text}</p>
      <ol className="flex flex-col gap-3">
        {t.steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3 rounded-3xl bg-surface p-4 shadow-soft">
            <span className="size-10 shrink-0 rounded-full bg-primary text-primary-ink grid place-items-center font-display text-xl">{i + 1}</span>
            <span className="font-semibold">
              {s} {i === 0 && <Share size={18} className="inline -mt-1 text-primary" aria-hidden />}
            </span>
          </li>
        ))}
      </ol>
      <button onClick={onContinue} className="press text-sm text-ink-soft underline min-h-11">
        {t.continueAnyway}
      </button>
    </main>
  )
}
