import { supabase } from './supabase'

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

/** Envoie une photo dans le dossier du foyer. Nécessite le réseau. */
export async function uploadPhoto(householdId: string, folder: string, file: Blob): Promise<string> {
  if (!supabase) throw new Error('Stockage indisponible (mode démo)')
  const blob = await compressImage(file)
  const path = `${householdId}/${folder}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(/fetch|network|load failed/i.test(error.message) ? 'Pas de réseau : réessaie quand tu seras connecté.' : error.message)
  return path
}

const urlCache = new Map<string, { url: string; exp: number }>()

/** Lien temporaire (1 h) pour afficher une photo privée. */
export async function photoUrl(path: string): Promise<string | null> {
  const hit = urlCache.get(path)
  if (hit && hit.exp > Date.now()) return hit.url
  if (!supabase) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error || !data) return null
  urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60_000 })
  return data.signedUrl
}

export async function deletePhoto(path: string) {
  await supabase?.storage.from(BUCKET).remove([path])
}
