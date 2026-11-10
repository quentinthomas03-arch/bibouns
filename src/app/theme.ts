import { useEffect, useState } from 'react'

export type ThemePref = 'auto' | 'hour' | 'light' | 'dark'
export type TextSize = 'normal' | 'large' | 'xlarge'

/** Veilleuse automatique : sombre de 21 h à 7 h. */
export const isNightHour = (d = new Date()) => d.getHours() >= 21 || d.getHours() < 7
const KEY = 'bibouns.theme'

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches) || (pref === 'hour' && isNightHour())
  document.documentElement.classList.toggle('dark', dark)
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute('content', dark ? '#1C1513' : '#FFF6EF')
  })
}

/** Thème par téléphone (chacun choisit) : auto suit le réglage de l'iPhone. */
export function useTheme(): [ThemePref, (p: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(() => {
    try {
      return (localStorage.getItem(KEY) as ThemePref) || 'auto'
    } catch {
      return 'auto'
    }
  })
  useEffect(() => {
    apply(pref)
    try {
      localStorage.setItem(KEY, pref)
    } catch {
      /* stockage indisponible : tant pis */
    }
    const mq = matchMedia('(prefers-color-scheme: dark)')
    // relit toujours le choix enregistré (un autre écran a pu le changer)
    const onChange = () => {
      let current: ThemePref = pref
      try {
        current = (localStorage.getItem(KEY) as ThemePref) || pref
      } catch {
        /* stockage indisponible */
      }
      apply(current)
    }
    mq.addEventListener('change', onChange)
    // mode "selon l'heure" : on revérifie chaque minute et au retour dans l'appli
    const t = setInterval(onChange, 60_000)
    document.addEventListener('visibilitychange', onChange)
    return () => {
      mq.removeEventListener('change', onChange)
      clearInterval(t)
      document.removeEventListener('visibilitychange', onChange)
    }
  }, [pref])
  return [pref, setPref]
}

const SIZE_KEY = 'bibouns.textsize'
export const TEXT_SCALE: Record<TextSize, string> = { normal: '100%', large: '112.5%', xlarge: '125%' }

/** Taille du texte (par téléphone) : tout est en rem, donc tout grandit. */
export function useTextSize(): [TextSize, (s: TextSize) => void] {
  const [size, setSize] = useState<TextSize>(() => {
    try {
      return (localStorage.getItem(SIZE_KEY) as TextSize) || 'normal'
    } catch {
      return 'normal'
    }
  })
  useEffect(() => {
    document.documentElement.style.fontSize = TEXT_SCALE[size] ?? '100%'
    try {
      localStorage.setItem(SIZE_KEY, size)
    } catch {
      /* stockage indisponible */
    }
  }, [size])
  return [size, setSize]
}
