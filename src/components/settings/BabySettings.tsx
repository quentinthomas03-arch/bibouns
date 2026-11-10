import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { toLocalInput } from '@/components/pregnancy/Sheets'
import { usePhase } from '@/app/phase'
import { useFeeding, useMeds } from '@/app/baby'
import { useSetting, useStore, stableId } from '@/sync/store'
import { FEEDING_HINT } from '@/content/baby'

/** Réglages bébé : identité, alimentation, soins habituels. */
export function BabySettings() {
  const { baby } = usePhase()
  const feeding = useFeeding()
  const meds = useMeds()
  const medReminder = useSetting<{ enabled: boolean; name: string; time: string } | null>('med_reminder', null)
  const { save, setSetting, householdId } = useStore()
  const toast = useToast()
  const [firstName, setFirstName] = useState('')
  const [sex, setSex] = useState<'f' | 'm' | 'x'>('x')
  const [bornAt, setBornAt] = useState('')
  const [newMed, setNewMed] = useState('')

  useEffect(() => {
    setFirstName((baby?.first_name as string) ?? '')
    setSex(((baby?.sex as 'f' | 'm' | 'x') ?? 'x') || 'x')
    setBornAt(baby?.born_at ? toLocalInput(baby.born_at as string) : '')
  }, [baby?.first_name, baby?.sex, baby?.born_at])

  const saveBaby = async (p: Record<string, unknown>) => {
    await save('babies', { id: (baby?.id as string) ?? stableId(householdId, 'baby'), first_name: firstName.trim() || null, sex, born_at: bornAt ? new Date(bornAt).toISOString() : null, deleted_at: null, ...p })
    toast('Enregistré ✓')
  }

  return (
    <>
      <SectionTitle>Bébé</SectionTitle>
      <Card className="flex flex-col gap-4">
        <Field label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} onBlur={() => firstName !== ((baby?.first_name as string) ?? '') && saveBaby({})} placeholder="Encore secret ?" />
        <Segmented<'f' | 'm' | 'x'>
          label="Sexe (pour les courbes de croissance)"
          value={sex}
          onChange={(v) => {
            setSex(v)
            void saveBaby({ sex: v })
          }}
          options={[
            { value: 'x', label: 'Surprise' },
            { value: 'f', label: 'Fille' },
            { value: 'm', label: 'Garçon' },
          ]}
        />
        <Field
          label="Date et heure de naissance"
          type="datetime-local"
          value={bornAt}
          onChange={(e) => setBornAt(e.target.value)}
          onBlur={() => saveBaby({})}
          hint="Une fois remplie, l’appli passe en mode « Après » (bascule manuelle possible sur l’accueil)."
        />
      </Card>

      <SectionTitle>Alimentation</SectionTitle>
      <Card className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">{FEEDING_HINT}</p>
        {(
          [
            ['breast', '🤱 Allaitement (chrono par côté)'],
            ['bottle', '🍼 Biberon (quantités)'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex items-center justify-between gap-3 min-h-12">
            <span className="font-semibold">{label}</span>
            <input
              type="checkbox"
              role="switch"
              checked={feeding[k]}
              onChange={(e) => {
                const next = { ...feeding, [k]: e.target.checked }
                if (!next.breast && !next.bottle) return toast('Gardez au moins un mode 😉')
                void setSetting('feeding', next)
              }}
              className="appearance-none w-14 h-8 rounded-full bg-line checked:bg-sage relative transition-colors cursor-pointer before:absolute before:top-1 before:left-1 before:size-6 before:rounded-full before:bg-surface before:shadow before:transition-transform checked:before:translate-x-6"
            />
          </label>
        ))}
      </Card>

      <SectionTitle>Soins en 1 tap</SectionTitle>
      <Card className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">Les boutons du + pour noter un soin (vitamine, médicament prescrit…). L’appli ne donne jamais de dose : suivez l’ordonnance.</p>
        <div className="flex flex-wrap gap-2">
          {meds.map((m) => (
            <span key={m} className="inline-flex items-center gap-1 rounded-full bg-surface-2 pl-4 pr-1 min-h-11 font-semibold">
              {m}
              <button aria-label={`Retirer ${m}`} onClick={() => setSetting('meds', meds.filter((x) => x !== m))} className="press size-9 grid place-items-center rounded-full">
                <X size={16} />
              </button>
            </span>
          ))}
        </div>
        <div className="rounded-2xl bg-surface-2 p-3 flex flex-col gap-2">
          <label className="flex items-center justify-between gap-3 min-h-11">
            <span className="font-semibold">🔔 Me rappeler si ce n’est pas noté</span>
            <input
              type="checkbox"
              role="switch"
              checked={!!medReminder?.enabled}
              onChange={(e) => setSetting('med_reminder', { name: medReminder?.name ?? meds[0] ?? 'Vitamine D', time: medReminder?.time ?? '18:00', enabled: e.target.checked })}
              className="appearance-none shrink-0 w-14 h-8 rounded-full bg-line checked:bg-sage relative transition-colors cursor-pointer before:absolute before:top-1 before:left-1 before:size-6 before:rounded-full before:bg-surface before:shadow before:transition-transform checked:before:translate-x-6"
            />
          </label>
          {medReminder?.enabled && (
            <div className="flex flex-wrap items-center gap-2">
              {meds.map((m) => (
                <button key={m} type="button" aria-pressed={medReminder.name === m} onClick={() => setSetting('med_reminder', { ...medReminder, name: m })} className={`press min-h-10 px-3 rounded-full text-sm font-semibold ${medReminder.name === m ? 'bg-ink text-bg' : 'bg-surface'}`}>
                  {m}
                </button>
              ))}
              <label className="flex items-center gap-2 ml-auto font-semibold text-sm">
                à
                <input type="time" value={medReminder.time} onChange={(e) => e.target.value && setSetting('med_reminder', { ...medReminder, time: e.target.value })} className="min-h-10 rounded-xl bg-surface px-2 border-2 border-transparent focus:border-primary" aria-label="Heure du rappel" />
              </label>
            </div>
          )}
          <p className="text-xs text-ink-soft">Une notification à vous deux, seulement si le soin n’a pas encore été noté ce jour-là (heure de Paris).</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const v = newMed.trim()
            if (v && !meds.includes(v)) void setSetting('meds', [...meds, v])
            setNewMed('')
          }}
        >
          <Field label="Ajouter un soin" className="flex-1" value={newMed} onChange={(e) => setNewMed(e.target.value)} placeholder="Ex. Sérum physiologique" />
          <Button type="submit" size="md" className="self-end min-h-13">
            Ajouter
          </Button>
        </form>
      </Card>
    </>
  )
}
