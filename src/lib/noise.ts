/**
 * Bruit doux (« bruit brun », plus grave et plus doux que le bruit blanc),
 * généré par le téléphone : aucun fichier, aucun réseau.
 * Montée et descente progressives, arrêt automatique.
 */

/** Échantillons de bruit brun (marche aléatoire filtrée), normalisés dans [-1, 1]. */
export function brownNoise(length: number, random: () => number = Math.random): Float32Array {
  const out = new Float32Array(length)
  let last = 0
  for (let i = 0; i < length; i++) {
    last = (last + 0.02 * (random() * 2 - 1)) / 1.02
    out[i] = last * 3.5
  }
  let max = 0
  for (const v of out) max = Math.max(max, Math.abs(v))
  if (max > 0) for (let i = 0; i < length; i++) out[i] /= max
  return out
}

export interface NoiseHandle {
  stop: () => void
}

export function startNoise(minutes: number | null, volume = 0.35, onEnd?: () => void): NoiseHandle {
  // iOS 17+ : jouer même si le téléphone est en mode silencieux
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
  if (session) session.type = 'playback'
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctx()
  const seconds = 8
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const data = brownNoise(buffer.length)
  // fondu aux extrémités de la boucle pour éviter un "clic" à chaque tour
  const fade = Math.floor(ctx.sampleRate * 0.05)
  for (let i = 0; i < fade; i++) {
    data[i] *= i / fade
    data[data.length - 1 - i] *= i / fade
  }
  buffer.copyToChannel(data as Float32Array<ArrayBuffer>, 0)
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 3)
  src.connect(gain).connect(ctx.destination)
  src.start()

  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false
  const stop = (fadeSeconds = 2) => {
    if (stopped) return
    stopped = true
    if (timer) clearTimeout(timer)
    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeSeconds)
    setTimeout(() => {
      src.stop()
      void ctx.close()
      onEnd?.()
    }, fadeSeconds * 1000 + 100)
  }
  if (minutes) timer = setTimeout(() => stop(20), Math.max(0, minutes * 60_000 - 20_000)) // fondu de 20 s à la fin
  return { stop: () => stop() }
}
