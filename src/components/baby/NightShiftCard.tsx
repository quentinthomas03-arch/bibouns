import { useState } from 'react'
import { Repeat } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'
import { useMembers } from '@/app/members'
import { useNow } from '@/app/useNow'
import { useSetting, useStore } from '@/sync/store'
import { currentNightDate, whoOnNight, type NightShift } from '@/lib/nightshift'

/** "Cette nuit, c'est Aude qui veille" + échange en 1 tap. */
export function NightShiftCard() {
  const cfg = useSetting<NightShift | null>('night_shift', null)
  const { members } = useMembers()
  const { setSetting } = useStore()
  const toast = useToast()
  const now = useNow(60_000)
  const [setup, setSetup] = useState(false)
  // même ordre que le serveur (ordre d'arrivée dans le foyer)
  const ordered = [...members].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
  const ids = ordered.map((m) => m.id)
  const tonight = currentNightDate(now)
  const duty = whoOnNight(cfg, ids, tonight)
  const dutyM = ordered.find((m) => m.id === duty)
  const tomorrow = (() => {
    const d = new Date(tonight + 'T12:00')
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })()
  const nextM = ordered.find((m) => m.id === whoOnNight(cfg, ids, tomorrow))

  if (members.length < 2) return null

  if (!cfg?.enabled)
    return (
      <>
        <button onClick={() => setSetup(true)} className="press mt-4 w-full text-left rounded-3xl bg-surface-2 p-4 flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            🌙
          </span>
          <span className="flex-1">
            <span className="block font-bold">Organiser un tour de garde des nuits</span>
            <span className="block text-sm text-ink-soft">Une nuit chacun, avec un rappel à 21 h</span>
          </span>
        </button>
        <Sheet open={setup} onClose={() => setSetup(false)} title="Tour de garde">
          <p className="mb-4">Qui veille cette nuit ? Ensuite, ça alterne chaque soir (échange possible en 1 tap).</p>
          <div className="grid grid-cols-2 gap-3">
            {ordered.map((m) => (
              <button
                key={m.id}
                onClick={async () => {
                  await setSetting('night_shift', { enabled: true, startMember: m.id, startDate: tonight, overrides: {} } satisfies NightShift)
                  setSetup(false)
                  toast('Tour de garde activé 🌙')
                }}
                className="press rounded-3xl bg-surface shadow-soft p-4 flex flex-col items-center gap-2 font-bold"
              >
                <Avatar emoji={m.avatar} color={m.color} size={56} />
                {m.first_name}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-soft mt-4">Le rappel du soir se règle dans Réglages → Notifications.</p>
        </Sheet>
      </>
    )

  return (
    <Card className="mt-4 !p-4 flex items-center gap-3">
      {dutyM && <Avatar emoji={dutyM.avatar} color={dutyM.color} size={48} />}
      <div className="flex-1">
        <p className="font-bold leading-tight">🌙 Cette nuit : {dutyM?.first_name} veille</p>
        <p className="text-sm text-ink-soft">Demain : {nextM?.first_name}</p>
      </div>
      <button
        aria-label="Échanger cette nuit"
        onClick={async () => {
          const other = ids.find((id) => id !== duty)!
          await setSetting('night_shift', { ...cfg, overrides: { ...cfg.overrides, [tonight]: other } })
          toast('Nuit échangée 🔄')
        }}
        className="press size-12 rounded-2xl bg-surface-2 grid place-items-center"
      >
        <Repeat size={20} />
      </button>
      <Button variant="ghost" size="md" className="!px-2 text-xs" onClick={() => setSetting('night_shift', { ...cfg, enabled: false })}>
        Arrêter
      </Button>
    </Card>
  )
}
