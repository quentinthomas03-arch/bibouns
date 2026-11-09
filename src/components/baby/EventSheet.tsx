import { useEffect, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/Toast'
import { toLocalInput } from '@/components/pregnancy/Sheets'
import { useFeeding, useMeds, type BabyEventRow } from '@/app/baby'
import { useStore } from '@/sync/store'
import type { BabyEvent, EventKind } from '@/lib/baby'
import { BOTTLE_PRESETS, DIAPER_COLORS, DIAPER_TEXTURES, KIND_EMOJI, KIND_LABEL, PALE_STOOL_ALERT } from '@/content/baby'

const chip = (on: boolean) => `press min-h-11 px-4 rounded-full font-semibold text-sm ${on ? 'bg-ink text-bg' : 'bg-surface-2'}`

/** Saisie détaillée ou modification d'un événement bébé. */
export function EventSheet({ open, onClose, kind, event }: { open: boolean; onClose: () => void; kind: EventKind; event?: BabyEventRow | null }) {
  const feeding = useFeeding()
  const meds = useMeds()
  const { save, remove } = useStore()
  const toast = useToast()
  const k: EventKind = event?.kind ?? kind
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [data, setData] = useState<BabyEvent['data']>({})
  const [mlText, setMlText] = useState('')

  useEffect(() => {
    if (!open) return
    const now = toLocalInput(new Date().toISOString())
    setStart(event ? toLocalInput(event.started_at) : now)
    setEnd(event?.ended_at ? toLocalInput(event.ended_at) : '')
    const d = event?.data ?? (k === 'feed' ? { mode: feeding.bottle ? 'bottle' : 'breast', side: 'L' } : k === 'diaper' ? { pee: true, poo: false } : k === 'med' ? { name: meds[0] ?? '' } : {})
    setData(d as BabyEvent['data'])
    setMlText(d && 'ml' in d && d.ml ? String(d.ml) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event, k])

  const set = (p: BabyEvent['data']) => setData((d) => ({ ...d, ...p }))
  const hasEnd = k === 'sleep' || (k === 'feed' && data.mode === 'breast')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const d = { ...data }
    if (k === 'feed' && d.mode === 'bottle') {
      const v = parseInt(mlText, 10)
      d.ml = Number.isFinite(v) && v > 0 ? v : undefined
      delete d.side
    }
    if (k === 'feed' && d.mode === 'breast') delete d.ml
    if (k === 'med' && !d.name?.trim()) return
    const started_at = new Date(start).toISOString()
    let ended_at = hasEnd && end ? new Date(end).toISOString() : null
    if (ended_at && ended_at < started_at) ended_at = started_at
    await save('baby_events', { id: event?.id, kind: k, data: d, started_at, ended_at })
    toast(event ? 'Modifié ✓' : 'Noté ✓')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={`${KIND_EMOJI[k]} ${KIND_LABEL[k]}`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {k === 'feed' && (
          <>
            {(feeding.breast && feeding.bottle) || event ? (
              <Segmented<'breast' | 'bottle'>
                label="Type de repas"
                value={data.mode ?? 'bottle'}
                onChange={(mode) => set({ mode })}
                options={[
                  { value: 'breast', label: '🤱 Tétée' },
                  { value: 'bottle', label: '🍼 Biberon' },
                ]}
              />
            ) : null}
            {data.mode === 'breast' ? (
              <Segmented<'L' | 'R'>
                label="Côté"
                value={data.side ?? 'L'}
                onChange={(side) => set({ side })}
                options={[
                  { value: 'L', label: 'Gauche' },
                  { value: 'R', label: 'Droite' },
                ]}
              />
            ) : (
              <>
                <fieldset>
                  <legend className="font-bold mb-1.5 px-1">Quantité (ml)</legend>
                  <div className="grid grid-cols-4 gap-2">
                    {BOTTLE_PRESETS.map((v) => (
                      <button type="button" key={v} aria-pressed={mlText === String(v)} onClick={() => setMlText(String(v))} className={chip(mlText === String(v))}>
                        {v}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <Field label="Autre quantité (ml)" inputMode="numeric" value={mlText} onChange={(e) => setMlText(e.target.value.replace(/\D/g, ''))} />
                <Segmented<'infantile' | 'maternel'>
                  label="Lait"
                  value={data.milk ?? 'infantile'}
                  onChange={(milk) => set({ milk })}
                  options={[
                    { value: 'infantile', label: 'Lait infantile' },
                    { value: 'maternel', label: 'Lait maternel' },
                  ]}
                />
              </>
            )}
          </>
        )}

        {k === 'diaper' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={!!data.pee} onClick={() => set({ pee: !data.pee })} className={`${chip(!!data.pee)} min-h-14 text-base`}>
                💧 Pipi
              </button>
              <button type="button" aria-pressed={!!data.poo} onClick={() => set({ poo: !data.poo })} className={`${chip(!!data.poo)} min-h-14 text-base`}>
                💩 Caca
              </button>
            </div>
            {data.poo && (
              <>
                <fieldset>
                  <legend className="font-bold mb-1.5 px-1">Couleur (facultatif)</legend>
                  <div className="flex flex-wrap gap-2">
                    {DIAPER_COLORS.map((c) => (
                      <button type="button" key={c.key} aria-pressed={data.color === c.key} onClick={() => set({ color: data.color === c.key ? undefined : c.key })} className={`${chip(data.color === c.key)} inline-flex items-center gap-2`}>
                        <span className="size-4 rounded-full border border-line" style={{ background: c.swatch }} aria-hidden />
                        {c.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {data.color === 'pale' && (
                  <p role="alert" className="rounded-2xl bg-mustard/25 border-2 border-mustard/50 p-3 text-sm font-semibold">
                    ⚠️ {PALE_STOOL_ALERT}
                  </p>
                )}
                <fieldset>
                  <legend className="font-bold mb-1.5 px-1">Consistance (facultatif)</legend>
                  <div className="flex flex-wrap gap-2">
                    {DIAPER_TEXTURES.map((t) => (
                      <button type="button" key={t} aria-pressed={data.texture === t} onClick={() => set({ texture: data.texture === t ? undefined : t })} className={chip(data.texture === t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
          </>
        )}

        {k === 'med' && (
          <>
            <div className="flex flex-wrap gap-2">
              {meds.map((m) => (
                <button type="button" key={m} aria-pressed={data.name === m} onClick={() => set({ name: m })} className={chip(data.name === m)}>
                  {m}
                </button>
              ))}
            </div>
            <Field label="Nom" value={data.name ?? ''} onChange={(e) => set({ name: e.target.value })} placeholder="Vitamine, sérum phy, médicament prescrit…" />
          </>
        )}

        <div className={`grid gap-3 ${hasEnd ? 'grid-cols-2' : ''}`}>
          <Field label={hasEnd ? 'Début' : 'Heure'} type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
          {hasEnd && <Field label="Fin" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} hint="Vide = en cours" />}
        </div>

        <Button type="submit" block>
          Enregistrer
        </Button>
        {event && (
          <Button type="button" variant="danger" block icon={<Trash2 size={18} />} onClick={async () => { await remove('baby_events', event.id); onClose() }}>
            Supprimer
          </Button>
        )}
      </form>
    </Sheet>
  )
}
