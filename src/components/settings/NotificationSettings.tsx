import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useSetting, useStore } from '@/sync/store'
import { currentSubscription, disablePush, enablePush, pushSupport, sendTestPush } from '@/lib/push'

const CATEGORIES = [
  ['appointments', '📅 Rendez-vous (selon le rappel choisi)'],
  ['vaccines', '💉 Vaccins (7 jours avant et le jour J, à 9 h)'],
  ['deadlines', '⏰ Échéances des listes (3 jours avant et le jour J)'],
  ['assigned', '👉 Tâche qui m’est attribuée'],
  ['notes', '💌 Mots doux'],
  ['backup', '💾 Rappel de sauvegarde (le 1er du mois)'],
] as const

type Prefs = Record<(typeof CATEGORIES)[number][0], boolean>
const DEFAULT: Prefs = { appointments: true, vaccines: true, deadlines: true, assigned: true, notes: true, backup: true }

export function NotificationSettings() {
  const { memberId, householdId, setSetting } = useStore()
  const prefs = { ...DEFAULT, ...useSetting<Partial<Prefs>>(`notif:${memberId}`, {}) }
  const toast = useToast()
  const support = pushSupport()
  const [active, setActive] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (support === 'ok') void currentSubscription().then((s) => setActive(!!s && Notification.permission === 'granted'))
  }, [support])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <SectionTitle>Notifications</SectionTitle>
      <Card className="flex flex-col gap-3">
        {support === 'install' && <p className="text-sm">📲 Sur iPhone, les notifications fonctionnent uniquement depuis l’appli <strong>installée sur l’écran d’accueil</strong> (iOS 16.4 ou plus récent).</p>}
        {support === 'unsupported' && <p className="text-sm">Ce navigateur ne gère pas les notifications.</p>}
        {support === 'ok' && (
          <>
            <p className="text-sm text-ink-soft">À activer sur chaque téléphone. Les messages sont chiffrés : seul ton téléphone peut les lire.</p>
            {active ? (
              <div className="flex gap-2">
                <Button size="md" variant="soft" className="flex-1" loading={busy} icon={<Bell size={18} />} onClick={() => run(async () => toast((await sendTestPush()) ? 'Notification envoyée 🔔' : 'Aucun appareil trouvé : réactive les notifications'))}>
                  Tester
                </Button>
                <Button size="md" variant="outline" loading={busy} icon={<BellOff size={18} />} onClick={() => run(async () => { await disablePush(); setActive(false) })}>
                  Couper
                </Button>
              </div>
            ) : (
              <Button block loading={busy} icon={<Bell size={20} />} onClick={() => run(async () => { await enablePush(householdId, memberId); setActive(true); toast('Notifications activées 🔔') })}>
                Activer les notifications
              </Button>
            )}
          </>
        )}
        <fieldset className="flex flex-col gap-1 mt-1">
          <legend className="font-bold mb-1">Je veux être prévenu·e pour…</legend>
          {CATEGORIES.map(([k, label]) => (
            <label key={k} className="flex items-center justify-between gap-3 min-h-12">
              <span className="text-[0.95rem]">{label}</span>
              <input
                type="checkbox"
                role="switch"
                checked={prefs[k]}
                onChange={(e) => setSetting(`notif:${memberId}`, { ...prefs, [k]: e.target.checked })}
                className="appearance-none shrink-0 w-14 h-8 rounded-full bg-line checked:bg-sage relative transition-colors cursor-pointer before:absolute before:top-1 before:left-1 before:size-6 before:rounded-full before:bg-surface before:shadow before:transition-transform checked:before:translate-x-6"
              />
            </label>
          ))}
        </fieldset>
      </Card>
    </>
  )
}
