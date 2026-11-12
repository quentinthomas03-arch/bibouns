import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Camera, Check, FileText, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Field, TextArea } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/Toast'
import { GrowthChart } from '@/components/health/GrowthChart'
import { AppointmentSheet, type Appointment } from '@/components/pregnancy/Sheets'
import { usePhase } from '@/app/phase'
import { useRows, useStore, stableId } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'
import { assess, ageInDays, formatPercentile, GROWTH_SOURCE, type GrowthKey, type Sex } from '@/lib/growth'
import { examSchedule, rsvDate, vaccineSchedule, type ScheduledDose } from '@/lib/health'
import { deletePhoto, uploadPhoto } from '@/lib/photos'
import { PrivatePhoto } from '@/components/PrivatePhoto'
import { QuestionsPanel } from '@/components/Questions'
import { CheckCircle } from '@/components/MilestoneCheck'
import { useToggleAppointment } from '@/screens/Track'
import { DOC_KINDS, EXAMS_DISCLAIMER, GROWTH_NOTE, RSV_INFO, VACCINE_DISCLAIMER } from '@/content/health'

type Tab = 'croissance' | 'vaccins' | 'rdv' | 'documents'
interface GrowthRow extends BaseRow {
  measured_on: string
  weight_g?: number | null
  length_mm?: number | null
  head_mm?: number | null
}
interface VaccineRowT extends BaseRow {
  code: string
  due_date?: string | null
  done_on?: string | null
  lot?: string | null
  notes?: string | null
}
interface DocRow extends BaseRow {
  title: string
  kind?: string | null
  doc_date?: string | null
  notes?: string | null
  photo_path?: string | null
}

const today = () => new Date().toISOString().slice(0, 10)
const fmtDate = (d: string) => new Date(d.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

/** Date de référence : naissance réelle, sinon date prévue (dates prévisionnelles). */
function useBirth() {
  const { baby, dueDate } = usePhase()
  const born = (baby?.born_at as string | undefined)?.slice(0, 10) ?? null
  return { birth: born ?? dueDate, provisional: !born, sex: (baby?.sex as Sex | 'x' | undefined) ?? 'x', name: (baby?.first_name as string) || 'Biboun' }
}

export function Health() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'croissance'
  const { birth, provisional } = useBirth()
  return (
    <div className="px-4 pt-safe pb-tabbar max-w-lg mx-auto">
      <header className="flex items-center gap-2 pt-2">
        <Link to="/plus" aria-label="Retour" className="press size-11 grid place-items-center rounded-full bg-surface shadow-soft">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-3xl font-semibold flex-1">Carnet de santé</h1>
      </header>
      <div role="tablist" className="mt-3 flex gap-1 rounded-2xl bg-surface-2 p-1">
        {(
          [
            ['croissance', 'Croissance'],
            ['vaccins', 'Vaccins'],
            ['rdv', 'RDV'],
            ['documents', 'Docs'],
          ] as [Tab, string][]
        ).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setParams({ tab: v }, { replace: true })} className={`press flex-1 min-h-11 rounded-xl text-sm font-bold ${tab === v ? 'bg-surface shadow-soft' : 'text-ink-soft'}`}>
            {l}
          </button>
        ))}
      </div>
      {provisional && birth && (tab === 'vaccins' || tab === 'rdv') && (
        <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-2 text-sm">📅 Dates prévisionnelles, calculées depuis la date prévue. Elles se recalent dès que la naissance est saisie.</p>
      )}
      {!birth ? (
        <p className="mt-8 text-center text-ink-soft">Ajoute la date prévue ou la date de naissance dans les réglages.</p>
      ) : tab === 'croissance' ? (
        <Growth birth={birth} provisional={provisional} />
      ) : tab === 'vaccins' ? (
        <Vaccines birth={birth} />
      ) : tab === 'rdv' ? (
        <BabyAppointments birth={birth} />
      ) : (
        <Documents />
      )}
    </div>
  )
}

// ------------------------------------------------------------------ croissance
const METRICS: { key: GrowthKey; label: string; unit: string; get: (r: GrowthRow) => number | null }[] = [
  { key: 'weight', label: '⚖️ Poids', unit: 'kg', get: (r) => (r.weight_g ? r.weight_g / 1000 : null) },
  { key: 'length', label: '📏 Taille', unit: 'cm', get: (r) => (r.length_mm ? r.length_mm / 10 : null) },
  { key: 'head', label: '🧠 Périmètre crânien', unit: 'cm', get: (r) => (r.head_mm ? r.head_mm / 10 : null) },
]

function Growth({ birth, provisional }: { birth: string; provisional: boolean }) {
  const rows = (useRows<GrowthRow>('growth') ?? []).sort((a, b) => a.measured_on.localeCompare(b.measured_on))
  const { sex: babySex } = useBirth()
  const [chosenSex, setChosenSex] = useState<Sex>('f')
  const sex: Sex = babySex === 'm' || babySex === 'f' ? babySex : chosenSex
  const [metric, setMetric] = useState<GrowthKey>('weight')
  const [adding, setAdding] = useState<GrowthRow | null | undefined>(undefined)
  const m = METRICS.find((x) => x.key === metric)!
  const points = rows.map((r) => ({ days: ageInDays(birth, r.measured_on), value: m.get(r) })).filter((p): p is { days: number; value: number } => p.value !== null && p.days >= 0)
  const last = points.at(-1)
  const a = last ? assess(metric, sex, last.days, last.value) : null

  return (
    <section className="mt-4 flex flex-col gap-4">
      {provisional && <p className="rounded-2xl bg-surface-2 px-4 py-2 text-sm">Les courbes démarrent à la naissance : saisis la date de naissance dans les réglages pour des âges exacts.</p>}
      {babySex !== 'm' && babySex !== 'f' && (
        <Segmented<Sex>
          label="Courbes"
          value={chosenSex}
          onChange={setChosenSex}
          options={[
            { value: 'f', label: 'Courbes fille' },
            { value: 'm', label: 'Courbes garçon' },
          ]}
        />
      )}
      <Segmented<GrowthKey> label="Mesure" value={metric} onChange={setMetric} options={[
          { value: 'weight', label: 'Poids' },
          { value: 'length', label: 'Taille' },
          { value: 'head', label: 'Crâne' },
        ]} />
      <Card>
        <h2 className="font-display text-xl font-semibold">{m.label}</h2>
        {a && last ? (
          <p className="text-sm text-ink-soft">
            Dernière mesure : <strong className="text-ink">{last.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {m.unit}</strong> · {formatPercentile(a.percentile)} (médiane OMS à cet âge : {a.median.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} {m.unit})
          </p>
        ) : (
          <p className="text-sm text-ink-soft">Ajoute une première mesure pour voir la courbe.</p>
        )}
        <GrowthChart kind={metric} sex={sex} points={points} unit={m.unit} />
        <p className="text-xs text-ink-soft mt-1">Zone verte : du 15e au 85e percentile · pointillés : 3e et 97e · trait plein : médiane.</p>
      </Card>
      <Button block icon={<Plus size={20} />} onClick={() => setAdding(null)}>
        Nouvelle mesure
      </Button>
      <ul className="flex flex-col gap-2">
        {[...rows].reverse().map((r) => (
          <li key={r.id}>
            <button onClick={() => setAdding(r)} className="press w-full text-left rounded-3xl bg-surface shadow-soft p-3 flex gap-3 items-center">
              <span className="font-bold w-28">{fmtDate(r.measured_on)}</span>
              <span className="text-sm flex-1">{[r.weight_g && `${(r.weight_g / 1000).toLocaleString('fr-FR')} kg`, r.length_mm && `${(r.length_mm / 10).toLocaleString('fr-FR')} cm`, r.head_mm && `PC ${(r.head_mm / 10).toLocaleString('fr-FR')} cm`].filter(Boolean).join(' · ')}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-soft px-1">
        <strong>Source :</strong> {GROWTH_SOURCE}. {GROWTH_NOTE}
      </p>
      <GrowthSheet open={adding !== undefined} initial={adding ?? undefined} onClose={() => setAdding(undefined)} />
    </section>
  )
}

function GrowthSheet({ open, initial, onClose }: { open: boolean; initial?: GrowthRow; onClose: () => void }) {
  const { save, remove } = useStore()
  const toast = useToast()
  const [date, setDate] = useState(today())
  const [w, setW] = useState('')
  const [l, setL] = useState('')
  const [h, setH] = useState('')
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    setDate(initial?.measured_on ?? today())
    setW(initial?.weight_g ? String(initial.weight_g / 1000).replace('.', ',') : '')
    setL(initial?.length_mm ? String(initial.length_mm / 10).replace('.', ',') : '')
    setH(initial?.head_mm ? String(initial.head_mm / 10).replace('.', ',') : '')
    setErr(null)
  }, [open, initial])
  const num = (s: string) => {
    const v = parseFloat(s.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(v) ? v : null
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    const wk = num(w)
    const lc = num(l)
    const hc = num(h)
    if (wk === null && lc === null && hc === null) return setErr('Au moins une mesure.')
    if (wk !== null && (wk < 0.5 || wk > 25)) return setErr('Poids en kg, par ex. 3,45')
    if (lc !== null && (lc < 30 || lc > 120)) return setErr('Taille en cm, par ex. 51')
    if (hc !== null && (hc < 25 || hc > 60)) return setErr('Périmètre crânien en cm, par ex. 35')
    await save('growth', { id: initial?.id, measured_on: date, weight_g: wk !== null ? Math.round(wk * 1000) : null, length_mm: lc !== null ? Math.round(lc * 10) : null, head_mm: hc !== null ? Math.round(hc * 10) : null })
    toast('Mesure enregistrée 📏')
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Mesure de croissance">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Field label="Poids (kg)" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} placeholder="3,45" />
        <Field label="Taille (cm)" inputMode="decimal" value={l} onChange={(e) => setL(e.target.value)} placeholder="51" />
        <Field label="Périmètre crânien (cm)" inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} placeholder="35" />
        {err && (
          <p role="alert" className="text-danger font-semibold">
            {err}
          </p>
        )}
        <Button type="submit" block>
          Enregistrer
        </Button>
        {initial && (
          <Button type="button" variant="danger" block icon={<Trash2 size={18} />} onClick={async () => { await remove('growth', initial.id); onClose() }}>
            Supprimer
          </Button>
        )}
      </form>
    </Sheet>
  )
}

// ------------------------------------------------------------------ vaccins
const STATUS: Record<ScheduledDose['status'], { label: string; cls: string }> = {
  done: { label: 'Fait', cls: 'bg-sage/40' },
  late: { label: 'À rattraper', cls: 'bg-danger/15 text-danger' },
  due: { label: 'Maintenant', cls: 'bg-primary-soft' },
  soon: { label: 'Bientôt', cls: 'bg-mustard/30' },
  later: { label: 'Plus tard', cls: 'bg-surface-2' },
}

function Vaccines({ birth }: { birth: string }) {
  const rows = useRows<VaccineRowT>('vaccines') ?? []
  const schedule = vaccineSchedule(birth, rows, today())
  const [editing, setEditing] = useState<ScheduledDose | null>(null)
  const rsv = rsvDate(birth)
  const groups = useMemo(() => {
    const m = new Map<string, ScheduledDose[]>()
    for (const d of schedule) {
      const k = d.ageLabel ?? `${d.months} mois`
      m.set(k, [...(m.get(k) ?? []), d])
    }
    return [...m.entries()]
  }, [schedule])
  const done = schedule.filter((d) => d.status === 'done').length

  return (
    <section className="mt-4 flex flex-col gap-4">
      <div role="note" className="rounded-3xl bg-mustard/25 border-2 border-mustard/50 p-4 text-sm">
        <strong>⚠️ Le carnet de santé fait foi.</strong> {VACCINE_DISCLAIMER}
      </div>
      <p className="font-semibold text-ink-soft px-1">
        {done}/{schedule.length} injections notées · <span className="rounded-full bg-ink text-bg px-2 py-0.5 text-xs">obligatoire</span> = vaccin obligatoire
      </p>
      {groups.map(([age, doses]) => (
        <Card key={age} className="!p-4">
          <p className="font-display text-xl font-semibold">
            {age} <span className="text-sm text-ink-soft font-sans font-semibold">· vers le {fmtDate(doses[0].due)}</span>
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {doses.map((d) => (
              <li key={d.code}>
                <button onClick={() => setEditing(d)} className="press w-full text-left flex items-start gap-3 min-h-12">
                  <span className={`mt-0.5 size-7 shrink-0 rounded-full grid place-items-center ${d.status === 'done' ? 'bg-sage text-white' : 'border-[3px] border-line'}`}>{d.status === 'done' && <Check size={16} strokeWidth={3.5} />}</span>
                  <span className="flex-1">
                    <span className="block font-semibold leading-snug">{d.label}</span>
                    <span className="flex flex-wrap gap-1.5 mt-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS[d.status].cls}`}>{d.status === 'done' && d.row?.done_on ? `Fait le ${fmtDate(d.row.done_on)}` : STATUS[d.status].label}</span>
                      {d.mandatory && <span className="rounded-full bg-ink text-bg px-2 py-0.5 text-xs font-bold">obligatoire</span>}
                    </span>
                    {d.note && <span className="block text-xs text-ink-soft mt-1">{d.note}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
      <Card className="!p-4 bg-surface-2">
        <p className="font-bold">🫁 {RSV_INFO.label}</p>
        <p className="text-sm mt-1">{rsv.atBirth ? 'Naissance pendant la campagne : en général proposé à la maternité.' : `Repère : dès le début de la campagne, vers le ${fmtDate(rsv.date)}.`}</p>
        <p className="text-xs text-ink-soft mt-1">{RSV_INFO.note}</p>
      </Card>
      <VaccineSheet dose={editing} onClose={() => setEditing(null)} />
    </section>
  )
}

function VaccineSheet({ dose, onClose }: { dose: ScheduledDose | null; onClose: () => void }) {
  const { save, householdId } = useStore()
  const [doneOn, setDoneOn] = useState('')
  const [lot, setLot] = useState('')
  const [notes, setNotes] = useState('')
  useEffect(() => {
    setDoneOn(dose?.row?.done_on ?? '')
    setLot(dose?.row?.lot ?? '')
    setNotes(dose?.row?.notes ?? '')
  }, [dose])
  if (!dose) return null
  const persist = (p: Partial<VaccineRowT>) => save('vaccines', { id: stableId(householdId, 'vaccine', dose.code), code: dose.code, due_date: dose.row?.due_date ?? null, done_on: doneOn || null, lot: lot || null, notes: notes || null, ...p })
  return (
    <Sheet open onClose={onClose} title={dose.label}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">
          Conseillé vers le {fmtDate(dose.due)}
          {dose.mandatory ? ' · vaccin obligatoire' : ' · recommandé'}
        </p>
        {!dose.row?.done_on && (
          <Button
            block
            icon={<Check size={20} />}
            onClick={async () => {
              await persist({ done_on: today() })
              onClose()
            }}
          >
            Fait aujourd’hui
          </Button>
        )}
        <Field label="Date de l’injection" type="date" value={doneOn} onChange={(e) => setDoneOn(e.target.value)} />
        <Field label="N° de lot (facultatif)" value={lot} onChange={(e) => setLot(e.target.value)} />
        <TextArea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Réaction, médecin…" />
        <Button
          variant="soft"
          block
          onClick={async () => {
            await persist({})
            onClose()
          }}
        >
          Enregistrer
        </Button>
      </div>
    </Sheet>
  )
}

// ------------------------------------------------------------------ rendez-vous bébé
function BabyAppointments({ birth }: { birth: string }) {
  const all = useRows<Appointment>('appointments', (a) => a.subject === 'baby') ?? []
  const [editing, setEditing] = useState<Partial<Appointment> | null>(null)
  const toggleDone = useToggleAppointment()
  const exams = examSchedule(birth)
  const now = new Date().toISOString()
  const upcoming = all.filter((a) => a.starts_at >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const past = all.filter((a) => a.starts_at < now).sort((a, b) => b.starts_at.localeCompare(a.starts_at))
  const t = today()
  const suggestions = exams.filter((e) => e.end >= t && !all.some((a) => a.title === e.label)).slice(0, 3)

  return (
    <section className="mt-4 flex flex-col gap-3">
      <QuestionsPanel subject="baby" />
      <Button block icon={<Plus size={20} />} onClick={() => setEditing({ subject: 'baby' })}>
        Ajouter un rendez-vous
      </Button>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((e) => (
            <button key={e.code} onClick={() => setEditing({ subject: 'baby', kind: 'consultation', title: e.label, starts_at: e.start + 'T10:00:00' })} className="press rounded-full bg-primary-soft px-4 min-h-11 font-semibold text-sm">
              + {e.label} ({fmtDate(e.start)})
            </button>
          ))}
        </div>
      )}
      {[...upcoming, ...past].map((a) => (
        <Card key={a.id} className={`!p-3 flex items-center gap-2 ${a.done || a.starts_at < now ? 'opacity-75' : ''}`}>
          <CheckCircle checked={a.done} onToggle={() => toggleDone(a)} label={a.title} />
          <button onClick={() => setEditing(a)} className="press flex-1 min-w-0 text-left">
            <p className={`font-bold ${a.done ? 'line-through' : ''}`}>{a.title}</p>
            <p className="text-sm text-ink-soft">
              {a.done ? '✓ Fait · ' : ''}
              {new Date(a.starts_at).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              {a.location ? ` · ${a.location}` : ''}
            </p>
          </button>
        </Card>
      ))}
      <details className="rounded-3xl bg-surface-2 p-4 text-sm">
        <summary className="font-bold cursor-pointer min-h-8">Repères des examens de suivi (0-2 ans)</summary>
        <ul className="mt-2 flex flex-col gap-1">
          {exams.map((e) => (
            <li key={e.code}>
              {e.label} — {fmtDate(e.start)}
              {e.certificate ? ' · certificat de santé' : ''}
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-soft mt-2">{EXAMS_DISCLAIMER}</p>
      </details>
      <AppointmentSheet open={!!editing} onClose={() => setEditing(null)} initial={editing ?? undefined} subject="baby" />
    </section>
  )
}

// ------------------------------------------------------------------ documents
function Documents() {
  const docs = (useRows<DocRow>('documents') ?? []).sort((a, b) => (b.doc_date ?? '').localeCompare(a.doc_date ?? ''))
  const [editing, setEditing] = useState<DocRow | null | undefined>(undefined)
  return (
    <section className="mt-4 flex flex-col gap-3">
      <Button block icon={<Camera size={20} />} onClick={() => setEditing(null)}>
        Ajouter un document
      </Button>
      {docs.length === 0 && <p className="text-center text-ink-soft py-6">Ordonnances, comptes rendus, résultats… tout au même endroit.</p>}
      <div className="grid grid-cols-2 gap-3">
        {docs.map((d) => (
          <button key={d.id} onClick={() => setEditing(d)} className="press text-left rounded-3xl bg-surface shadow-soft overflow-hidden">
            <div className="aspect-[4/3] bg-surface-2 grid place-items-center">{d.photo_path ? <PrivatePhoto path={d.photo_path} alt={d.title} /> : <FileText className="text-ink-soft" size={36} />}</div>
            <div className="p-3">
              <p className="font-bold leading-tight truncate">{d.title}</p>
              <p className="text-xs text-ink-soft">{[d.kind, d.doc_date && fmtDate(d.doc_date)].filter(Boolean).join(' · ')}</p>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-soft px-1">Photos compressées sur le téléphone et stockées dans votre espace privé (UE), visibles uniquement par vous deux.</p>
      <DocSheet open={editing !== undefined} initial={editing ?? undefined} onClose={() => setEditing(undefined)} />
    </section>
  )
}


function DocSheet({ open, initial, onClose }: { open: boolean; initial?: DocRow; onClose: () => void }) {
  const { save, remove, householdId } = useStore()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState(DOC_KINDS[0])
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title ?? '')
    setKind(initial?.kind ?? DOC_KINDS[0])
    setDate(initial?.doc_date ?? today())
    setNotes(initial?.notes ?? '')
    setFile(null)
    setPreview(null)
    setErr(null)
  }, [open, initial])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setErr('Donne un titre au document.')
    setBusy(true)
    setErr(null)
    try {
      let photo_path = initial?.photo_path ?? null
      if (file) {
        const newPath = await uploadPhoto(householdId, 'documents', file)
        if (photo_path) void deletePhoto(photo_path)
        photo_path = newPath
      }
      await save('documents', { id: initial?.id, title: title.trim(), kind, doc_date: date, notes: notes.trim() || null, photo_path })
      toast('Document enregistré 📄')
      onClose()
    } catch (ex) {
      setErr((ex as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? 'Document' : 'Nouveau document'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            setFile(f)
            setPreview(f ? URL.createObjectURL(f) : null)
          }}
        />
        <button type="button" onClick={() => fileRef.current?.click()} className="press rounded-3xl bg-surface-2 aspect-[4/3] grid place-items-center overflow-hidden border-2 border-dashed border-line">
          {preview ? (
            <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />
          ) : initial?.photo_path ? (
            <PrivatePhoto path={initial.photo_path} alt={initial.title} className="w-full h-full object-contain" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-ink-soft font-semibold">
              <Camera size={32} /> Prendre ou choisir une photo
            </span>
          )}
        </button>
        <Field label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ordonnance vitamine D…" />
        <div className="flex flex-wrap gap-2">
          {DOC_KINDS.map((k) => (
            <button type="button" key={k} aria-pressed={kind === k} onClick={() => setKind(k)} className={`press min-h-11 px-4 rounded-full font-semibold text-sm ${kind === k ? 'bg-ink text-bg' : 'bg-surface-2'}`}>
              {k}
            </button>
          ))}
        </div>
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <TextArea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {err && (
          <p role="alert" className="text-danger font-semibold">
            {err}
          </p>
        )}
        <Button type="submit" block loading={busy}>
          Enregistrer
        </Button>
        {initial && (
          <Button
            type="button"
            variant="danger"
            block
            icon={<Trash2 size={18} />}
            onClick={async () => {
              if (initial.photo_path) void deletePhoto(initial.photo_path)
              await remove('documents', initial.id)
              onClose()
            }}
          >
            Supprimer
          </Button>
        )}
      </form>
    </Sheet>
  )
}
