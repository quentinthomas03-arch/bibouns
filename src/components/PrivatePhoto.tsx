import { useEffect, useState } from 'react'
import { photoUrl } from '@/lib/photos'

/** Image privée affichée via un lien signé temporaire. */
export function PrivatePhoto({ path, alt, className = 'w-full h-full object-cover' }: { path: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    void photoUrl(path).then((u) => {
      if (!alive) return
      if (u) setUrl(u)
      else setFailed(true)
    })
    return () => {
      alive = false
    }
  }, [path])
  if (failed) return <span className="text-xs text-ink-soft p-2 text-center">Photo visible avec du réseau</span>
  if (!url) return <span className="size-6 rounded-full border-[3px] border-line border-r-transparent animate-spin" aria-label="Chargement" />
  return <img src={url} alt={alt} className={className} loading="lazy" />
}
