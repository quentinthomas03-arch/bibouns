import { supabase } from './supabase'
import { PhotoQueue, type UploadResult } from './photoQueue'

export const BUCKET = 'household-files'
/** Taille max d'une photo après compression (côté le plus long, en px). */
export const MAX_SIDE = 2048
export const JPEG_QUALITY = 0.82

/**
 * Compresse une image côté téléphone avant envoi (JPEG ~2048 px, souvent
 * 300-700 Ko au lieu de 3-5 Mo). L'orientation EXIF est respectée.
 */
export async function compressImage(file: Blob, maxSide = MAX_SIDE, quality = JPEG_QUALITY): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions).catch(() => null)
  const src: { width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void } = bitmap
    ? { width: bitmap.width, height: bitmap.height, draw: (c, w, h) => c.drawImage(bitmap, 0, 0, w, h) }
    : await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, draw: (c, w, h) => c.drawImage(img, 0, 0, w, h) })
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height))
  const w = Math.round(src.width * scale)
  const h = Math.round(src.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  src.draw(ctx, w, h)
  bitmap?.close()
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('compression impossible'))), 'image/jpeg', quality))
}

/** Envoi réel vers le stockage privé (idempotent : un renvoi écrase la même photo). */
async function sendToStorage(path: string, blob: Blob): Promise<UploadResult> {
  if (!supabase || !navigator.onLine) return 'network'
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true })
  if (!error) return 'ok'
  return /fetch|network|load failed|timeout/i.test(error.message) ? 'network' : 'error'
}

/** File d'envoi partagée par toute l'appli. */
export const photoQueue = new PhotoQueue(sendToStorage)

/** Relance l'envoi au retour du réseau, au retour dans l'appli et toutes les minutes. */
export function startPhotoQueue() {
  const kick = () => void photoQueue.flush()
  window.addEventListener('online', kick)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && kick())
  setInterval(kick, 60_000)
  kick()
}

/**
 * Prépare une photo : compression, chemin définitif, rangement local, envoi
 * en arrière-plan. Fonctionne sans réseau (la photo part plus tard).
 */
export async function uploadPhoto(householdId: string, folder: string, file: Blob): Promise<string> {
  if (!supabase) throw new Error('Stockage indisponible (mode démo)')
  const blob = await compressImage(file)
  const path = `${householdId}/${folder}/${crypto.randomUUID()}.jpg`
  await photoQueue.enqueue(path, blob)
  return path
}

const urlCache = new Map<string, { url: string; exp: number }>()

/** Lien pour afficher une photo : copie locale si elle n'est pas encore envoyée, sinon lien signé (1 h). */
export async function photoUrl(path: string): Promise<string | null> {
  const local = await photoQueue.local(path)
  if (local) return URL.createObjectURL(local)
  const hit = urlCache.get(path)
  if (hit && hit.exp > Date.now()) return hit.url
  if (!supabase) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error || !data) return null
  urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60_000 })
  return data.signedUrl
}

export async function deletePhoto(path: string) {
  await photoQueue.forget(path)
  await supabase?.storage.from(BUCKET).remove([path])
}

/** Télécharge une photo privée (pour la partager / l'enregistrer dans Photos). */
export async function downloadPhoto(path: string): Promise<Blob> {
  const local = await photoQueue.local(path)
  if (local) return local
  if (!supabase) throw new Error('Indisponible en mode démo')
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error || !data) throw new Error('Photo indisponible (réseau ?)')
  return data
}

/** Supprime tous les fichiers du foyer (avant la suppression définitive). */
export async function deleteAllFiles(householdId: string, onProgress?: (n: number) => void): Promise<number> {
  if (!supabase) return 0
  await photoQueue.clear()
  let removed = 0
  for (const folder of ['memories', 'documents']) {
    for (;;) {
      const { data, error } = await supabase.storage.from(BUCKET).list(`${householdId}/${folder}`, { limit: 100 })
      if (error) throw new Error('Impossible de lister les photos (réseau ?)')
      if (!data?.length) break
      const { error: e2 } = await supabase.storage.from(BUCKET).remove(data.map((f) => `${householdId}/${folder}/${f.name}`))
      if (e2) throw new Error('Impossible de supprimer les photos (réseau ?)')
      removed += data.length
      onProgress?.(removed)
    }
  }
  return removed
}
