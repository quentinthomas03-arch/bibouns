import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useBabyActions, useBabyEvents, useFeeding } from '@/app/baby'
import { useNow } from '@/app/useNow'
import { usePhase } from '@/app/phase'
import { formatDuration, lastBottleMl, lastOf, nextSide, running, timeAgo } from '@/lib/baby'
import { describeEvent } from '@/components/baby/describe'

/**
 * Écran de nuit : noir et rouge très atténué (préserve la vision de nuit et
 * le sommeil des autres), grande horloge, 1 tap par action, écran maintenu allumé.
 */
const C = { bg: '#000000', text: '#b8584a', dim: '#7a3a31', btn: '#160a08', line: '#3a1a14', on: '#5a221a' }

export function Night() {
  const navigate = useNavigate()
  const events = useBabyEvents()
  const feeding = useFeeding()
  const { baby } = usePhase()
  const { log, start, stop } = useBabyActions()
  const now = useNow(1000)
  const [flash, setFlash] = useState<string | null>(null)
  const feed = running(events, 'feed')
  const sleep = running(events, 'sleep')
  const lastFeed = lastOf(events, 'feed')
  const ml = lastBottleMl(events)
  const side = nextSide(events)

  // Garde l'écran allumé tant que l'écran de nuit est ouvert (si l'iPhone le permet)
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const ask = () => navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => undefined)
    void ask()
    const onVis = () => document.visibilityState === 'visible' && void ask()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      void lock?.release()
    }
  }, [])

  const act = async (label: string, fn: () => Promise<unknown>) => {
    await fn()
    setFlash(label)
    setTimeout(() => setFlash(null), 1500)
  }
  const elapsed = (from: string) => formatDuration(Math.floor((now.getTime() - Date.parse(from)) / 60000))
  const Btn = ({ label, sub, onClick, active }: { label: string; sub?: string; onClick: () => void; active?: boolean }) => (
    <button onClick={onClick} className="press rounded-3xl min-h-24 p-3 text-left" style={{ background: active ? C.on : C.btn, border: `2px solid ${C.line}`, color: C.text }}>
      <span className="block text-2xl font-bold leading-tight">{label}</span>
      {sub && <span className="block text-sm" style={{ color: C.dim }}>{sub}</span>}
    </button>
  )

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto pt-safe pb-safe" style={{ background: C.bg, color: C.text }}>
      <div className="max-w-lg mx-auto px-4 py-3 flex flex-col gap-4 min-h-full">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: C.dim }}>
            Mode nuit · {(baby?.first_name as string) || 'Biboun'}
          </span>
          <button aria-label="Quitter le mode nuit" onClick={() => navigate('/')} className="press size-12 rounded-full grid place-items-center" style={{ border: `2px solid ${C.line}` }}>
            <X />
          </button>
        </div>
        <p className="text-center font-display tabular-nums leading-none" style={{ fontSize: 'clamp(4rem, 22vw, 7rem)' }} aria-label={`Il est ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}>
          {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-center text-lg" aria-live="polite">
          {flash ?? (feed ? `Tétée ${feed.data.side === 'L' ? 'gauche' : 'droite'} · ${elapsed(feed.started_at)}` : sleep ? `Dort depuis ${elapsed(sleep.started_at)}` : lastFeed ? `Dernier repas ${timeAgo(lastFeed.started_at, now)} · ${describeEvent(lastFeed)}` : 'Aucun repas noté')}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {feed ? (
            <>
              <Btn label="⏹ Fin tétée" sub={elapsed(feed.started_at)} active onClick={() => act('Tétée terminée', () => stop(feed))} />
              <Btn label="⇄ Changer" sub={`passer ${feed.data.side === 'L' ? 'à droite' : 'à gauche'}`} onClick={() => act('Côté changé', async () => { await stop(feed); await start('feed', { mode: 'breast', side: feed.data.side === 'L' ? 'R' : 'L' }) })} />
            </>
          ) : (
            <>
              {feeding.breast && <Btn label="Tétée G" sub={side === 'L' ? 'conseillé' : undefined} active={side === 'L'} onClick={() => act('Tétée gauche lancée', () => start('feed', { mode: 'breast', side: 'L' }))} />}
              {feeding.breast && <Btn label="Tétée D" sub={side === 'R' ? 'conseillé' : undefined} active={side === 'R'} onClick={() => act('Tétée droite lancée', () => start('feed', { mode: 'breast', side: 'R' }))} />}
            </>
          )}
          {feeding.bottle && <Btn label={`Biberon ${ml}`} sub="ml" onClick={() => act(`Biberon ${ml} ml noté`, () => log('feed', { mode: 'bottle', ml }))} />}
          {sleep ? <Btn label="☀ Réveil" sub={elapsed(sleep.started_at)} active onClick={() => act('Réveil noté', () => stop(sleep))} /> : <Btn label="Dodo" sub="lance le chrono" onClick={() => act('Dodo lancé', () => start('sleep'))} />}
          <Btn label="Pipi" onClick={() => act('Pipi noté', () => log('diaper', { pee: true, poo: false }))} />
          <Btn label="Caca" onClick={() => act('Caca noté', () => log('diaper', { pee: false, poo: true }))} />
          <Btn label="Les deux" onClick={() => act('Couche notée', () => log('diaper', { pee: true, poo: true }))} />
        </div>
        <p className="text-center text-xs mt-auto" style={{ color: C.dim }}>
          Astuce : baisse la luminosité au minimum. Tout est synchronisé avec ton binôme.
        </p>
      </div>
    </div>
  )
}
