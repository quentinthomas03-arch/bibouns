import { useEffect, useState } from 'react'

export type ThemePref = 'auto' | 'light' | 'dark'
const KEY = 'bibouns.theme'

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
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
    const onChange = () => apply(pref)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])
  return [pref, setPref]
}
