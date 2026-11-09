import { useState } from 'react'
import { useBabyActions, useBabyEvents, useFeeding, useMeds } from '@/app/baby'
import { lastBottleMl, lastOf, nextSide, running } from '@/lib/baby'
import { useToast } from '@/components/ui/Toast'
import { RunningTimers } from './RunningTimers'
import { EventSheet } from './EventSheet'

interface Action {
  key: string
  emoji: string
  label: string
  sub?: string
  tone?: string
  run: () => Promise<unknown>
}

/**
 * Saisie bébé en 1 tap (2 taps avec le bouton +). Les détails se
 * complètent ensuite si besoin (heure, couleur, quantité…).
 */
export function QuickBaby({ onDone }: { onDone: () => void }) {
  const events = useBabyEvents()
  const feeding = useFeeding()
  const meds = useMeds()
  const { log, start, stop } = useBabyActions()
  const toast = useToast()
  const [details, setDetails] = useState<null | 'feed' | 'diaper' | 'sleep' | 'med'>(null)
  const feedRunning = running(events, 'feed')
  const sleepRunning = running(events, 'sleep')
  const ml = lastBottleMl(events)
  const side = nextSide(events)

  const done = (msg: string) => {
    toast(msg)
    onDone()
  }

  const actions: Action[] = []
  if (feeding.bottle) actions.push({ key: 'bottle', emoji: '🍼', label: `Biberon ${ml} ml`, sub: lastOf(events, 'feed', (e) => e.data.mode === 'bottle') ? 'comme la dernière fois' : 'modifiable ensuite', run: async () => { await log('feed', { mode: 'bottle', ml }); done(`Biberon ${ml} ml noté 🍼`) } })
  if (feeding.breast && !feedRunning) {
    actions.push({ key: 'L', emoji: '🤱', label: 'Tétée gauche', sub: side === 'L' ? 'conseillé' : undefined, tone: side === 'L' ? 'ring-2 ring-primary' : '', run: async () => { await start('feed', { mode: 'breast', side: 'L' }); done('Chrono lancé ⏱️') } })
    actions.push({ key: 'R', emoji: '🤱', label: 'Tétée droite', sub: side === 'R' ? 'conseillé' : undefined, tone: side === 'R' ? 'ring-2 ring-primary' : '', run: async () => { await start('feed', { mode: 'breast', side: 'R' }); done('Chrono lancé ⏱️') } })
  }
  actions.push({ key: 'pee', emoji: '💧', label: 'Pipi', run: async () => { await log('diaper', { pee: true, poo: false }); done('Couche notée 💧') } })
  actions.push({ key: 'poo', emoji: '💩', label: 'Caca', run: async () => { await log('diaper', { pee: false, poo: true }); done('Couche notée 💩') } })
  actions.push({ key: 'both', emoji: '💧💩', label: 'Les deux', run: async () => { await log('diaper', { pee: true, poo: true }); done('Couche notée') } })
  actions.push(
    sleepRunning
      ? { key: 'wake', emoji: '☀️', label: 'Réveil', sub: 'arrête le sommeil', run: async () => { await stop(sleepRunning); done('Bien dormi ? ☀️') } }
      : { key: 'sleep', emoji: '😴', label: 'Dodo', sub: 'lance le chrono', run: async () => { await start('sleep'); done('Chut… 😴') } },
  )
  for (const m of meds) actions.push({ key: `med-${m}`, emoji: '💊', label: m, run: async () => { await log('med', { name: m }); done(`${m} noté 💊`) } })

  return (
    <div className="flex flex-col gap-4">
      <RunningTimers />
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <button key={a.key} onClick={() => void a.run()} className={`press rounded-3xl bg-surface p-4 min-h-24 text-left shadow-soft ${a.tone ?? ''}`}>
            <span className="text-3xl block" aria-hidden>
              {a.emoji}
            </span>
            <span className="font-bold text-lg leading-tight block">{a.label}</span>
            {a.sub && <span className="text-xs font-semibold text-ink-soft">{a.sub}</span>}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-bold text-ink-soft self-center">Avec détails :</span>
        {(
          [
            ['feed', '🍼 Repas'],
            ['diaper', '🧷 Couche'],
            ['sleep', '😴 Sommeil'],
            ['med', '💊 Soin'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setDetails(k)} className="press rounded-full bg-surface-2 px-4 min-h-11 font-semibold text-sm">
            {l}
          </button>
        ))}
      </div>
      <EventSheet open={!!details} kind={details ?? 'feed'} onClose={() => { setDetails(null); onDone() }} />
    </div>
  )
}
