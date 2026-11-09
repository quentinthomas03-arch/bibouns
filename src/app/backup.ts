import { zipSync, strToU8 } from 'fflate'
import type { Ctx } from '@/sync/store'
import { TABLE_NAMES, type BaseRow } from '@/sync/tables'
import { chunk, frDate, frTime, photoFileName, toCsv, type Column } from '@/lib/export'
import { downloadPhoto } from '@/lib/photos'
import { describeEvent } from '@/components/baby/describe'
import type { BabyEvent } from '@/lib/baby'
import { minutesBetween } from '@/lib/baby'
import { FIRSTS } from '@/content/memories'

type Row = BaseRow & Record<string, unknown>
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))

/** Lit toutes les lignes (non supprimées) d'une table locale. */
async function rows(ctx: Ctx, table: (typeof TABLE_NAMES)[number]): Promise<Row[]> {
  return ((await ctx.db.rows(table).toArray()) as Row[]).filter((r) => !r.deleted_at)
}

const README = (date: string) => `Biboun's — export du ${date}

Contenu :
- tableaux/*.csv : vos données en tableaux (ouvrir avec Numbers ou Excel)
- donnees/*.json : toutes les données brutes (format technique, complet)
- photos-*.zip (fichiers séparés) : photos rangées par mois, en JPG

Gardez cet export dans un endroit sûr (iCloud Drive, ordinateur…).
Les données de santé sont personnelles : ne les partagez qu'en connaissance de cause.
`

/** ZIP des données : JSON complet + CSV lisibles. */
export async function buildDataZip(ctx: Ctx): Promise<Blob> {
  const files: Record<string, Uint8Array> = {}
  const dump: Record<string, Row[]> = {}
  for (const t of TABLE_NAMES) dump[t] = await rows(ctx, t)
  const members = new Map(dump.members.map((m) => [m.id, s(m.first_name)]))
  const who = (r: Row) => members.get(s(r.created_by)) ?? ''
  const lists = new Map(dump.checklists.map((l) => [l.id, s(l.title)]))

  for (const [t, list] of Object.entries(dump)) files[`donnees/${t}.json`] = strToU8(JSON.stringify(list, null, 2))

  const csv = <T extends Row>(name: string, list: T[], cols: Column<T>[]) => {
    if (list.length) files[`tableaux/${name}.csv`] = strToU8(toCsv(list, cols))
  }
  const byDate = (k: string) => (a: Row, b: Row) => s(a[k]).localeCompare(s(b[k]))

  csv('suivi-bebe', [...dump.baby_events].sort(byDate('started_at')), [
    { label: 'Date', get: (r) => frDate(s(r.started_at)) },
    { label: 'Heure', get: (r) => frTime(s(r.started_at)) },
    { label: 'Type', get: (r) => ({ feed: 'Repas', diaper: 'Couche', sleep: 'Sommeil', med: 'Soin' })[s(r.kind)] },
    { label: 'Détail', get: (r) => describeEvent(r as unknown as BabyEvent) },
    { label: 'Quantité (ml)', get: (r) => (r.data as BabyEvent['data'])?.ml ?? '' },
    { label: 'Durée (min)', get: (r) => (r.ended_at ? minutesBetween(s(r.started_at), s(r.ended_at)) : '') },
    { label: 'Noté par', get: who },
  ])
  csv('croissance', [...dump.growth].sort(byDate('measured_on')), [
    { label: 'Date', get: (r) => frDate(s(r.measured_on)) },
    { label: 'Poids (kg)', get: (r) => (r.weight_g ? Number(r.weight_g) / 1000 : '') },
    { label: 'Taille (cm)', get: (r) => (r.length_mm ? Number(r.length_mm) / 10 : '') },
    { label: 'Périmètre crânien (cm)', get: (r) => (r.head_mm ? Number(r.head_mm) / 10 : '') },
  ])
  csv('vaccins', dump.vaccines, [
    { label: 'Vaccin (code)', get: (r) => s(r.code) },
    { label: 'Fait le', get: (r) => frDate(s(r.done_on)) },
    { label: 'Lot', get: (r) => s(r.lot) },
    { label: 'Notes', get: (r) => s(r.notes) },
  ])
  csv('rendez-vous', [...dump.appointments].sort(byDate('starts_at')), [
    { label: 'Pour', get: (r) => (r.subject === 'baby' ? 'Bébé' : 'Grossesse') },
    { label: 'Date', get: (r) => frDate(s(r.starts_at)) },
    { label: 'Heure', get: (r) => frTime(s(r.starts_at)) },
    { label: 'Titre', get: (r) => s(r.title) },
    { label: 'Lieu', get: (r) => s(r.location) },
    { label: 'Questions', get: (r) => s(r.questions) },
    { label: 'Notes', get: (r) => s(r.notes) },
  ])
  csv('mesures-grossesse', [...dump.measurements].sort(byDate('measured_at')), [
    { label: 'Date', get: (r) => frDate(s(r.measured_at)) },
    { label: 'Mesure', get: (r) => (r.kind === 'weight' ? 'Poids (kg)' : 'Tension (mmHg)') },
    { label: 'Valeur', get: (r) => (r.kind === 'weight' ? Number(r.value) : `${r.value}/${r.value2}`) },
  ])
  csv('journal-grossesse', [...dump.journal_entries].sort(byDate('entry_date')), [
    { label: 'Date', get: (r) => frDate(s(r.entry_date)) },
    { label: 'Humeur (1-5)', get: (r) => (r.mood as number) ?? '' },
    { label: 'Ressentis', get: (r) => ((r.symptoms as string[]) ?? []).join(', ') },
    { label: 'Notes', get: (r) => s(r.body) },
    { label: 'Par', get: who },
  ])
  csv('listes', dump.checklist_items, [
    { label: 'Liste', get: (r) => lists.get(s(r.checklist_id)) ?? '' },
    { label: 'Élément', get: (r) => s(r.label) },
    { label: 'Fait', get: (r) => !!r.done },
    { label: 'Responsable', get: (r) => members.get(s(r.assignee)) ?? '' },
    { label: 'Échéance', get: (r) => frDate(s(r.due_date)) },
    { label: 'Budget (€)', get: (r) => (r.budget_cents ? Number(r.budget_cents) / 100 : '') },
    { label: 'Note', get: (r) => s(r.note) },
  ])
  csv('souvenirs', [...dump.memories].sort(byDate('memory_date')), [
    { label: 'Date', get: (r) => frDate(s(r.memory_date)) },
    { label: 'Titre', get: (r) => s(r.title) },
    { label: 'Texte', get: (r) => s(r.body) },
    { label: 'Première fois', get: (r) => FIRSTS.find((f) => f.key === r.first_kind)?.label ?? '' },
    { label: 'Nombre de photos', get: (r) => ((r.photo_paths as string[]) ?? []).length },
    { label: 'Par', get: who },
  ])
  csv('contractions', [...dump.contractions].sort(byDate('started_at')), [
    { label: 'Date', get: (r) => frDate(s(r.started_at)) },
    { label: 'Début', get: (r) => frTime(s(r.started_at)) },
    { label: 'Fin', get: (r) => frTime(s(r.ended_at)) },
  ])
  csv('mots-doux', [...dump.notes].sort(byDate('created_at')), [
    { label: 'Date', get: (r) => frDate(s(r.created_at)) },
    { label: 'Heure', get: (r) => frTime(s(r.created_at)) },
    { label: 'De', get: who },
    { label: 'Message', get: (r) => s(r.body) },
  ])

  files['LISEZ-MOI.txt'] = strToU8(README(new Date().toLocaleDateString('fr-FR')))
  return new Blob([zipSync(files, { level: 6 }) as Uint8Array<ArrayBuffer>], { type: 'application/zip' })
}

export interface PhotoRef {
  path: string
  name: string
}

/** Liste de toutes les photos (souvenirs + documents) avec leur nom de fichier final. */
export async function listPhotos(ctx: Ctx): Promise<PhotoRef[]> {
  const used = new Set<string>()
  const out: PhotoRef[] = []
  const memories = (await rows(ctx, 'memories')).sort((a, b) => s(a.memory_date).localeCompare(s(b.memory_date)))
  for (const m of memories) ((m.photo_paths as string[]) ?? []).forEach((p, i) => out.push({ path: p, name: photoFileName('souvenirs', s(m.memory_date), (m.title as string) || FIRSTS.find((f) => f.key === m.first_kind)?.label, i, used) }))
  for (const d of await rows(ctx, 'documents')) if (d.photo_path) out.push({ path: s(d.photo_path), name: photoFileName('documents', s(d.doc_date) || s(d.created_at), s(d.title), 0, used) })
  return out
}

export const PHOTOS_PER_ZIP = 120

/** ZIP d'un lot de photos (JPG déjà compressés : stockés tels quels). */
export async function buildPhotoZip(refs: PhotoRef[], onProgress: (done: number) => void): Promise<Blob> {
  const files: Record<string, [Uint8Array, { level: 0 }]> = {}
  let done = 0
  for (const r of refs) {
    const blob = await downloadPhoto(r.path)
    files[r.name] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }]
    onProgress(++done)
  }
  return new Blob([zipSync(files) as Uint8Array<ArrayBuffer>], { type: 'application/zip' })
}

export { chunk }
