import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Camera, Download, ImagePlus, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Field, TextArea } from '@/components/ui/Field'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'
import { Biboun } from '@/components/Biboun'
import { PrivatePhoto } from '@/components/PrivatePhoto'
import { usePhase } from '@/app/phase'
import { useMembers } from '@/app/members'
import { useRows, useStore } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'
import { deletePhoto, downloadPhoto, uploadPhoto } from '@/lib/photos'
import { groupByMonth, monthCardTitle, type MonthGroup } from '@/lib/memories'
import { drawMonthlyCard, shareFile } from '@/lib/card'
import { CARD_FOOTER, FIRSTS, MEMORY_LIMITS } from '@/content/memories'

type Tab = 'journal' | 'mois' | 'premieres'
interface Memory extends BaseRow {
  memory_date: string
  title?: string | null
  body?: string | null
  first_kind?: string | null
  photo_paths: string[]
}
interface GrowthRow extends BaseRow {
  measured_on: string
  weight_g?: number | null
  length_mm?: number | null
}

const today = () => new Date().toISOString().slice(0, 10)
const fmt = (d: string) => new Date(d.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
const firstOf = (k?: string | null) => FIRSTS.find((f) => f.key === k)

export function Memories() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'journal'
  const memories = (useRows<Memory>('memories') ?? []).sort((a, b) => b.memory_date.localeCompare(a.memory_date) || (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  const [editing, setEditing] = useState<Partial<Memory> | null>(null)
  const [viewer, setViewer] = useState<string | null>(null)
  const photoCount = memories.reduce((s, m) => s + m.photo_paths.length, 0)
  const usedMb = Math.round(photoCount * MEMORY_LIMITS.avgPhotoMb)

  return (
    <div className="px-4 pt-safe pb-tabbar max-w-lg mx-auto">
      <header className="flex items-center gap-2 pt-2">
        <Link to="/plus" aria-label="Retour" className="press size-11 grid place-items-center rounded-full bg-surface shadow-soft">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-3xl font-semibold flex-1">Souvenirs</h1>
        <Button size="md" icon={<Plus size={18} />} onClick={() => setEditing({})}>
          Ajouter
        </Button>
      </header>
      <div role="tablist" className="mt-3 flex gap-1 rounded-2xl bg-surface-2 p-1">
        {(
          [
            ['journal', 'Journal'],
            ['mois', 'Par mois'],
            ['premieres', 'Premières fois'],
          ] as [Tab, string][]
        ).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setParams({ tab: v }, { replace: true })} className={`press flex-1 min-h-11 rounded-xl text-sm font-bold ${tab === v ? 'bg-surface shadow-soft' : 'text-ink-soft'}`}>
            {l}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-soft px-1">
        📸 {photoCount} photo{photoCount > 1 ? 's' : ''} · ≈ {usedMb} Mo sur {MEMORY_LIMITS.freeStorageMb / 1024} Go gratuit (≈ {Math.floor(MEMORY_LIMITS.freeStorageMb / MEMORY_LIMITS.avgPhotoMb).toLocaleString('fr-FR')} photos)
      </p>

      {tab === 'journal' && <Journal memories={memories} onEdit={setEditing} onView={setViewer} />}
      {tab === 'mois' && <ByMonth memories={memories} onView={setViewer} />}
      {tab === 'premieres' && <Firsts memories={memories} onAdd={(k) => setEditing({ first_kind: k })} onEdit={setEditing} />}

      <MemorySheet initial={editing} onClose={() => setEditing(null)} />
      {viewer && <PhotoViewer path={viewer} onClose={() => setViewer(null)} />}
    </div>
  )
}

// ------------------------------------------------------------------ journal
function Journal({ memories, onEdit, onView }: { memories: Memory[]; onEdit: (m: Memory) => void; onView: (p: string) => void }) {
  const { byId } = useMembers()
  if (memories.length === 0)
    return (
      <div className="text-center py-12 flex flex-col items-center gap-2">
        <Biboun size={110} mood="love" className="animate-float" />
        <p className="font-display text-2xl">Votre album commence ici</p>
        <p className="text-ink-soft max-w-xs">Une photo, deux lignes, une date : dans quelques années, vous serez tellement contents de les retrouver.</p>
      </div>
    )
  return (
    <ul className="mt-4 flex flex-col gap-4">
      {memories.map((m) => {
        const first = firstOf(m.first_kind)
        const author = byId(m.created_by)
        return (
          <li key={m.id}>
            <Card className="!p-0 overflow-hidden">
              {m.photo_paths.length > 0 && (
                <div className={`grid gap-0.5 ${m.photo_paths.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {m.photo_paths.slice(0, 4).map((p, i) => (
                    <button key={p} onClick={() => onView(p)} className={`relative bg-surface-2 grid place-items-center overflow-hidden ${m.photo_paths.length === 1 ? 'aspect-[4/3]' : 'aspect-square'}`}>
                      <PrivatePhoto path={p} alt={m.title ?? 'Souvenir'} />
                      {i === 3 && m.photo_paths.length > 4 && <span className="absolute inset-0 bg-black/40 text-white font-display text-3xl grid place-items-center">+{m.photo_paths.length - 4}</span>}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => onEdit(m)} className="press w-full text-left p-4">
                <div className="flex items-center gap-2">
                  {author && <Avatar emoji={author.avatar} color={author.color} size={26} label={author.first_name} />}
                  <span className="text-sm font-bold text-ink-soft flex-1">{fmt(m.memory_date)}</span>
                  {first && <span className="rounded-full bg-mustard/30 px-2.5 py-1 text-xs font-bold">{first.emoji} {first.label}</span>}
                </div>
                {m.title && <p className="font-display text-xl font-semibold mt-1">{m.title}</p>}
                {m.body && <p className="mt-1 whitespace-pre-line">{m.body}</p>}
              </button>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}

// ------------------------------------------------------------------ mois par mois
function ByMonth({ memories, onView }: { memories: Memory[]; onView: (p: string) => void }) {
  const { baby } = usePhase()
  const birth = (baby?.born_at as string | undefined)?.slice(0, 10) ?? null
  const groups = groupByMonth(memories, birth)
  if (groups.length === 0) return <p className="text-center text-ink-soft py-10">Ajoute un premier souvenir pour voir l’album se remplir.</p>
  return (
    <div className="mt-4 flex flex-col gap-4">
      {groups.map((g) => (
        <MonthCard key={g.key} group={g} onView={onView} />
      ))}
    </div>
  )
}

function MonthCard({ group, onView }: { group: MonthGroup<Memory>; onView: (p: string) => void }) {
  const { baby } = usePhase()
  const growth = useRows<GrowthRow>('growth') ?? []
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const photos = group.items.flatMap((m) => m.photo_paths)
  const firsts = group.items.map((m) => firstOf(m.first_kind)).filter(Boolean)

  async function makeCard() {
    if (group.lifeMonth === null || group.lifeMonth < 0) return
    setBusy(true)
    try {
      const inMonth = group.items.map((m) => m.memory_date).sort()
      const end = inMonth.at(-1) ?? today()
      const g = [...growth].filter((x) => x.measured_on <= end).sort((a, b) => b.measured_on.localeCompare(a.measured_on))[0]
      const stats = [g?.weight_g && `${(g.weight_g / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`, g?.length_mm && `${(g.length_mm / 10).toLocaleString('fr-FR')} cm`].filter(Boolean) as string[]
      let photo: Blob | null = null
      if (photos[0]) photo = await downloadPhoto(photos[0]).catch(() => null)
      const blob = await drawMonthlyCard({
        title: monthCardTitle(group.lifeMonth),
        name: (baby?.first_name as string) || 'Biboun',
        photo,
        stats,
        firsts: firsts.map((f) => `${f!.emoji} ${f!.label}`),
        footer: CARD_FOOTER,
      })
      const r = await shareFile(blob, `biboun-${monthCardTitle(group.lifeMonth).replace(' ', '-')}.jpg`)
      if (r === 'downloaded') toast('Carte téléchargée 🖼️')
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="!p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-display text-2xl font-semibold first-letter:uppercase">{group.label}</p>
          <p className="text-sm text-ink-soft">
            {group.items.length} souvenir{group.items.length > 1 ? 's' : ''} · {photos.length} photo{photos.length > 1 ? 's' : ''}
          </p>
        </div>
        {group.lifeMonth !== null && group.lifeMonth >= 0 && (
          <Button size="md" variant="soft" loading={busy} icon={<Sparkles size={18} />} onClick={makeCard}>
            Carte
          </Button>
        )}
      </div>
      {photos.length > 0 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {photos.map((p) => (
            <button key={p} onClick={() => onView(p)} className="shrink-0 size-24 rounded-2xl overflow-hidden bg-surface-2 grid place-items-center">
              <PrivatePhoto path={p} alt="" />
            </button>
          ))}
        </div>
      )}
      {firsts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {firsts.map((f) => (
            <span key={f!.key} className="rounded-full bg-mustard/30 px-2.5 py-1 text-xs font-bold">
              {f!.emoji} {f!.label}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

// ------------------------------------------------------------------ premières fois
function Firsts({ memories, onAdd, onEdit }: { memories: Memory[]; onAdd: (k: string) => void; onEdit: (m: Memory) => void }) {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-3">
      {FIRSTS.map((f) => {
        const m = memories.find((x) => x.first_kind === f.key)
        return (
          <li key={f.key}>
            <button onClick={() => (m ? onEdit(m) : onAdd(f.key))} className={`press w-full text-left rounded-3xl p-4 min-h-28 shadow-soft ${m ? 'bg-primary-soft' : 'bg-surface'}`}>
              <span className={`text-3xl ${m ? '' : 'grayscale opacity-60'}`} aria-hidden>
                {f.emoji}
              </span>
              <span className="block font-bold leading-tight mt-1">{f.label}</span>
              <span className="block text-xs text-ink-soft font-semibold mt-0.5">{m ? fmt(m.memory_date) : 'à venir…'}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// ------------------------------------------------------------------ saisie
function MemorySheet({ initial, onClose }: { initial: Partial<Memory> | null; onClose: () => void }) {
  const { save, remove, householdId } = useStore()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [date, setDate] = useState(today())
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [first, setFirst] = useState<string | null>(null)
  const [paths, setPaths] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const open = initial !== null

  useEffect(() => {
    if (!initial) return
    setDate(initial.memory_date ?? today())
    setTitle(initial.title ?? (initial.first_kind ? (firstOf(initial.first_kind)?.label ?? '') : ''))
    setBody(initial.body ?? '')
    setFirst(initial.first_kind ?? null)
    setPaths(initial.photo_paths ?? [])
    setFiles([])
    setErr(null)
  }, [initial])

  const total = paths.length + files.length

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() && !body.trim() && total === 0) return setErr('Un titre, un texte ou une photo 🙂')
    setErr(null)
    try {
      const uploaded: string[] = []
      for (let i = 0; i < files.length; i++) {
        setBusy(`Photo ${i + 1}/${files.length}…`)
        uploaded.push(await uploadPhoto(householdId, 'memories', files[i]))
      }
      // photos retirées pendant l'édition : suppression du stockage
      for (const p of initial?.photo_paths ?? []) if (!paths.includes(p)) void deletePhoto(p)
      await save('memories', { id: initial?.id, memory_date: date, title: title.trim() || null, body: body.trim() || null, first_kind: first, photo_paths: [...paths, ...uploaded] })
      toast('Souvenir enregistré 💛')
      onClose()
    } catch (ex) {
      setErr((ex as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial?.id ? 'Souvenir' : 'Nouveau souvenir'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []).slice(0, MEMORY_LIMITS.perMemory - total)
            setFiles([...files, ...picked])
            e.target.value = ''
          }}
        />
        <div className="grid grid-cols-3 gap-2">
          {paths.map((p) => (
            <div key={p} className="relative aspect-square rounded-2xl overflow-hidden bg-surface-2 grid place-items-center">
              <PrivatePhoto path={p} alt="" />
              <button type="button" aria-label="Retirer la photo" onClick={() => setPaths(paths.filter((x) => x !== p))} className="absolute top-1 right-1 size-8 rounded-full bg-black/50 text-white grid place-items-center">
                <X size={16} />
              </button>
            </div>
          ))}
          {files.map((f, i) => (
            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-surface-2">
              <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
              <button type="button" aria-label="Retirer la photo" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute top-1 right-1 size-8 rounded-full bg-black/50 text-white grid place-items-center">
                <X size={16} />
              </button>
            </div>
          ))}
          {total < MEMORY_LIMITS.perMemory && (
            <button type="button" onClick={() => fileRef.current?.click()} className="press aspect-square rounded-2xl border-2 border-dashed border-line grid place-items-center text-ink-soft">
              <span className="flex flex-col items-center gap-1 text-xs font-bold">
                <ImagePlus size={28} /> Photo
              </span>
            </button>
          )}
        </div>
        <p className="text-xs text-ink-soft -mt-2">
          Jusqu’à {MEMORY_LIMITS.perMemory} photos, compressées sur le téléphone (~2000 px). Les originaux restent dans ta galerie.
        </p>
        <Field label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Premier bain, balade au parc…" />
        <TextArea label="Ce qu’on veut se rappeler" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ses mimiques, ce qu’on a ressenti…" />
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <fieldset>
          <legend className="font-bold mb-1.5 px-1">Une première fois ?</legend>
          <div className="flex flex-wrap gap-1.5">
            {FIRSTS.map((f) => (
              <button type="button" key={f.key} aria-pressed={first === f.key} onClick={() => setFirst(first === f.key ? null : f.key)} className={`press min-h-10 px-3 rounded-full text-sm font-semibold ${first === f.key ? 'bg-ink text-bg' : 'bg-surface-2'}`}>
                {f.emoji} {f.label}
              </button>
            ))}
          </div>
        </fieldset>
        {err && (
          <p role="alert" className="text-danger font-semibold">
            {err}
          </p>
        )}
        <Button type="submit" block loading={!!busy} icon={<Camera size={20} />}>
          {busy ?? 'Enregistrer'}
        </Button>
        {initial?.id && (
          <Button
            variant="danger"
            block
            icon={<Trash2 size={18} />}
            onClick={async () => {
              if (!confirm('Supprimer ce souvenir et ses photos ?')) return
              for (const p of initial.photo_paths ?? []) void deletePhoto(p)
              await remove('memories', initial.id!)
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

// ------------------------------------------------------------------ visionneuse
function PhotoViewer({ path, onClose }: { path: string; onClose: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  return (
    <div role="dialog" aria-modal="true" aria-label="Photo" className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
      <div className="flex justify-between p-3 pt-safe">
        <button onClick={onClose} aria-label="Fermer" className="press size-12 rounded-full bg-white/15 text-white grid place-items-center">
          <X />
        </button>
        <button
          onClick={async () => {
            setBusy(true)
            try {
              await shareFile(await downloadPhoto(path), 'souvenir-biboun.jpg')
            } catch (e) {
              toast((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
          className="press min-h-12 px-4 rounded-full bg-white/15 text-white font-bold inline-flex items-center gap-2"
        >
          <Download size={20} /> {busy ? '…' : 'Enregistrer / partager'}
        </button>
      </div>
      <div className="flex-1 grid place-items-center p-2" onClick={onClose}>
        <PrivatePhoto path={path} alt="Souvenir" className="max-w-full max-h-full object-contain" />
      </div>
    </div>
  )
}
