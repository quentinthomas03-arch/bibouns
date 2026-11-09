/**
 * Carte mensuelle (1080 × 1350, format portrait Instagram/WhatsApp) dessinée
 * sur le téléphone avec un canvas : rien n'est envoyé à un service tiers.
 */

const BIBOUN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <path d="M60 26 C 58 14, 66 6, 78 6 C 78 18, 70 26, 60 26 Z" fill="#E3AD4F"/>
  <path d="M60 30 L 60 22" stroke="#8C5A3C" stroke-width="3" stroke-linecap="round"/>
  <path d="M60 24 C 92 24, 104 50, 102 74 C 100 98, 82 106, 60 106 C 38 106, 20 98, 18 74 C 16 50, 28 24, 60 24 Z" fill="#D9734E"/>
  <ellipse cx="60" cy="91" rx="22" ry="13" fill="#F7D3BF" opacity="0.9"/>
  <ellipse cx="34" cy="70" rx="7" ry="4.5" fill="#F09A8F"/><ellipse cx="86" cy="70" rx="7" ry="4.5" fill="#F09A8F"/>
  <path d="M44 66 l-6 -6 a4 4 0 0 1 6 -5 a4 4 0 0 1 6 5 z" fill="#B04E2C"/>
  <path d="M76 66 l-6 -6 a4 4 0 0 1 6 -5 a4 4 0 0 1 6 5 z" fill="#B04E2C"/>
  <path d="M52 71 Q 60 80 68 71" stroke="#3A2621" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export interface CardInput {
  title: string // "3 mois"
  name: string
  photo?: Blob | null
  stats?: string[] // ["5,9 kg", "60 cm"]
  firsts?: string[] // ["😊 Premier sourire"]
  footer: string
}

export async function drawMonthlyCard(input: CardInput): Promise<Blob> {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  await document.fonts?.ready

  // fond crème + taches automnales
  ctx.fillStyle = '#FFF6EF'
  ctx.fillRect(0, 0, W, H)
  const blob = (x: number, y: number, r: number, c: string) => {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  blob(980, 120, 220, '#F8D6C6')
  blob(80, 1260, 260, '#F7B98A88')
  blob(1020, 1180, 120, '#F4C3BA')

  // titre
  ctx.fillStyle = '#B04E2C'
  ctx.font = '600 150px "Fredoka Variable", "Fredoka", system-ui, sans-serif'
  ctx.fillText(input.title, 80, 210)
  ctx.fillStyle = '#3A2621'
  ctx.font = '600 72px "Fredoka Variable", "Fredoka", system-ui, sans-serif'
  ctx.fillText(input.name, 84, 300)

  // photo (recadrée en "cover")
  const px = 80
  const py = 350
  const pw = W - 160
  const ph = 620
  ctx.save()
  roundRect(ctx, px, py, pw, ph, 56)
  ctx.clip()
  ctx.fillStyle = '#FBE6DA'
  ctx.fillRect(px, py, pw, ph)
  if (input.photo) {
    const url = URL.createObjectURL(input.photo)
    try {
      const img = await loadImage(url)
      const s = Math.max(pw / img.width, ph / img.height)
      const w = img.width * s
      const h = img.height * s
      ctx.drawImage(img, px + (pw - w) / 2, py + (ph - h) / 2, w, h)
    } finally {
      URL.revokeObjectURL(url)
    }
  } else {
    const mascot = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BIBOUN_SVG))
    ctx.drawImage(mascot, px + pw / 2 - 220, py + ph / 2 - 220, 440, 440)
  }
  ctx.restore()

  // statistiques en pastilles
  let x = 80
  const y = 1030
  ctx.font = '700 44px "Nunito Variable", "Nunito", system-ui, sans-serif'
  for (const s of input.stats ?? []) {
    const w = ctx.measureText(s).width + 64
    ctx.fillStyle = '#FFFFFF'
    roundRect(ctx, x, y, w, 84, 42)
    ctx.fill()
    ctx.fillStyle = '#3A2621'
    ctx.fillText(s, x + 32, y + 57)
    x += w + 20
  }

  // premières fois
  ctx.font = '600 42px "Nunito Variable", "Nunito", system-ui, sans-serif'
  ctx.fillStyle = '#3A2621'
  ;(input.firsts ?? []).slice(0, 2).forEach((f, i) => ctx.fillText(f, 84, 1180 + i * 58))

  // mascotte + signature
  const mascot = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BIBOUN_SVG))
  ctx.drawImage(mascot, W - 230, H - 250, 170, 170)
  ctx.font = '600 32px "Nunito Variable", "Nunito", system-ui, sans-serif'
  ctx.fillStyle = '#7A5348'
  ctx.textAlign = 'right'
  ctx.fillText(input.footer, W - 80, H - 50)

  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('carte impossible'))), 'image/jpeg', 0.9))
}

/** Partage (ou enregistre dans Photos) un fichier via le menu de partage iOS. */
export async function shareFile(blob: Blob, filename: string, title?: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  return 'downloaded'
}
