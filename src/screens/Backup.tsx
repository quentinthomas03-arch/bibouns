import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Download, Image, Trash2, RotateCcw } from 'lucide-react'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/app/session'
import { useMembers } from '@/app/members'
import { useSetting, useStore, nowIso } from '@/sync/store'
import type { TableName } from '@/sync/tables'
import { buildDataZip, buildPhotoZip, chunk, listPhotos, PHOTOS_PER_ZIP, type PhotoRef } from '@/app/backup'
import { shareFile } from '@/lib/card'
import { deleteAllFiles } from '@/lib/photos'
import { supabase } from '@/lib/supabase'

const stamp = () => new Date().toISOString().slice(0, 10)

/** Sauvegarde, export (ZIP), livre imprimable et suppression des données. */
export function Backup() {
  const store = useStore()
  const { setSetting } = store
  const { byId } = useMembers()
  const last = useSetting<{ at: string; by: string } | null>('last_export', null)
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [photos, setPhotos] = useState<PhotoRef[] | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    void listPhotos(store).then(setPhotos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const parts = chunk(photos ?? [], PHOTOS_PER_ZIP)
  const daysSince = last ? Math.floor((Date.now() - Date.parse(last.at)) / 86_400_000) : null

  async function exportData() {
    setBusy('data')
    try {
      await store.engine.syncNow()
      const zip = await buildDataZip(store)
      const r = await shareFile(zip, `bibouns-donnees-${stamp()}.zip`, "Sauvegarde Biboun's")
      if (r !== 'cancelled') await setSetting('last_export', { at: nowIso(), by: store.memberId })
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function exportPhotos(i: number) {
    setBusy(`photos-${i}`)
    try {
      const zip = await buildPhotoZip(parts[i], (n) => setBusy(`photos-${i}:${n}`))
      await shareFile(zip, `bibouns-photos-${stamp()}${parts.length > 1 ? `-partie${i + 1}` : ''}.zip`)
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="px-4 pt-safe pb-tabbar max-w-lg mx-auto">
      <header className="flex items-center gap-2 pt-2">
        <Link to="/reglages" aria-label="Retour" className="press size-11 grid place-items-center rounded-full bg-surface shadow-soft">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-3xl font-semibold flex-1">Sauvegarde</h1>
      </header>

      <Card className={`mt-4 ${daysSince === null || daysSince > 31 ? 'bg-mustard/25' : ''}`}>
        <p className="font-bold">{last ? `Dernier export il y a ${daysSince} jour${daysSince! > 1 ? 's' : ''} (${byId(last.by)?.first_name ?? '…'})` : 'Aucun export pour l’instant'}</p>
        <p className="text-sm text-ink-soft mt-1">L’offre gratuite de Supabase ne fournit pas de sauvegarde téléchargeable : un export par mois, rangé dans iCloud Drive, met vos souvenirs à l’abri.</p>
      </Card>

      <SectionTitle>Exporter</SectionTitle>
      <Card className="flex flex-col gap-3">
        <Button block loading={busy === 'data'} icon={<Download size={20} />} onClick={exportData}>
          Données (tableaux + fichiers complets)
        </Button>
        <p className="text-xs text-ink-soft">Un fichier ZIP : tableaux CSV (Numbers/Excel) + données complètes (JSON). Choisis « Enregistrer dans Fichiers » → iCloud Drive.</p>
        {photos === null ? (
          <p className="text-sm text-ink-soft">Recherche des photos…</p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucune photo pour l’instant.</p>
        ) : (
          parts.map((p, i) => {
            const b = busy?.startsWith(`photos-${i}`)
            const n = b && busy!.includes(':') ? Number(busy!.split(':')[1]) : 0
            return (
              <Button key={i} block variant="soft" loading={b} disabled={!!busy && !b} icon={<Image size={20} />} onClick={() => exportPhotos(i)}>
                {b ? `Photos ${n}/${p.length}…` : `Photos${parts.length > 1 ? ` (partie ${i + 1}/${parts.length})` : ''} · ${p.length}`}
              </Button>
            )
          })
        )}
        {photos && photos.length > 0 && <p className="text-xs text-ink-soft">Photos rangées par mois (souvenirs/2027-05_mai/…), en JPG : prêtes pour un livre photo. Réseau nécessaire.</p>}
      </Card>

      <SectionTitle>Livre de naissance</SectionTitle>
      <Link to="/livre" className="press block">
        <Card className="flex items-center gap-4">
          <BookOpen size={32} className="text-primary shrink-0" />
          <span>
            <span className="block font-bold">Ouvrir le livre mois par mois</span>
            <span className="block text-sm text-ink-soft">Mise en page à imprimer ou à enregistrer en PDF</span>
          </span>
        </Card>
      </Link>

      <SectionTitle>Zone sensible</SectionTitle>
      <Card className="flex flex-col gap-3">
        <Button variant="outline" block icon={<RotateCcw size={18} />} onClick={() => setResetOpen(true)}>
          Effacer des données de test
        </Button>
        <Button variant="danger" block icon={<Trash2 size={18} />} onClick={() => setDeleteOpen(true)}>
          Supprimer toutes nos données
        </Button>
      </Card>

      <ResetSheet open={resetOpen} onClose={() => setResetOpen(false)} />
      <DeleteSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  )
}

const RESETTABLE: { tables: TableName[]; label: string }[] = [
  { tables: ['baby_events'], label: '🍼 Suivi bébé (repas, couches, sommeil, soins)' },
  { tables: ['contractions'], label: '⏱️ Contractions' },
  { tables: ['babies', 'growth'], label: '👶 Naissance de test et mesures de croissance' },
  { tables: ['notes'], label: '💌 Mots doux' },
  { tables: ['measurements', 'journal_entries'], label: '⚖️ Mesures et journal de grossesse' },
]

function ResetSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, remove, setSetting } = useStore()
  const toast = useToast()
  const [chosen, setChosen] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  async function run() {
    if (!chosen.length || !confirm('Effacer ces données sur les deux téléphones ?')) return
    setBusy(true)
    let n = 0
    for (const i of chosen) {
      for (const t of RESETTABLE[i].tables) {
        for (const r of await db.rows(t).toArray()) if (!r.deleted_at) {
          await remove(t, r.id)
          n++
        }
      }
      if (RESETTABLE[i].tables.includes('contractions') || RESETTABLE[i].tables.includes('babies')) {
        await setSetting('labor_started', false)
        await setSetting('phase_manual', null)
      }
    }
    setBusy(false)
    toast(`${n} élément${n > 1 ? 's' : ''} effacé${n > 1 ? 's' : ''}`)
    setChosen([])
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Effacer des données de test">
      <div className="flex flex-col gap-2">
        {RESETTABLE.map((r, i) => (
          <label key={r.label} className="flex items-center gap-3 min-h-12 rounded-2xl bg-surface-2 px-3">
            <input type="checkbox" className="size-6 accent-[var(--primary)]" checked={chosen.includes(i)} onChange={(e) => setChosen(e.target.checked ? [...chosen, i] : chosen.filter((x) => x !== i))} />
            <span className="font-semibold">{r.label}</span>
          </label>
        ))}
        <p className="text-xs text-ink-soft">Les listes, prénoms, rendez-vous, vaccins et souvenirs ne sont pas concernés.</p>
        <Button block variant="danger" loading={busy} disabled={!chosen.length} onClick={run}>
          Effacer la sélection
        </Button>
      </div>
    </Sheet>
  )
}

function DeleteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { householdId } = useStore()
  const { signOut } = useSession()
  const toast = useToast()
  const [word, setWord] = useState('')
  const [step, setStep] = useState<string | null>(null)
  async function run() {
    if (!supabase) return toast('Indisponible en mode démo')
    try {
      setStep('Suppression des photos…')
      await deleteAllFiles(householdId, (n) => setStep(`Suppression des photos… ${n}`))
      setStep('Suppression des données…')
      const { data, error } = await supabase.rpc('delete_household', { p_confirm: word.trim() })
      if (error || !data?.ok) throw new Error('Suppression impossible (réseau ?)')
      await signOut()
    } catch (e) {
      toast((e as Error).message)
      setStep(null)
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Tout supprimer ?">
      <div className="flex flex-col gap-4">
        <p>
          Cette action supprime <strong>définitivement</strong>, pour vous deux : les données, les photos, les notifications et les raccourcis. Elle est <strong>irréversible</strong>.
        </p>
        <p className="rounded-2xl bg-mustard/25 p-3 text-sm">💡 Faites d’abord un export des données et des photos.</p>
        <Field label="Pour confirmer, écris SUPPRIMER" value={word} onChange={(e) => setWord(e.target.value)} autoCapitalize="characters" autoCorrect="off" />
        <Button variant="danger" block disabled={word.trim() !== 'SUPPRIMER' || !!step} loading={!!step} onClick={run}>
          {step ?? 'Supprimer définitivement'}
        </Button>
      </div>
    </Sheet>
  )
}
