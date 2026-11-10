import { useEffect, useState } from 'react'
import { photoUrl } from '@/lib/photos'

/** Image privée affichée via un lien signé temporaire. */
export function PrivatePhoto({ path, alt, className = 'w-full h-full object-cover' }: { path: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    let created: string | null = null
    void photoUrl(path).then((u) => {
      if (u?.startsWith('blob:')) created = u
      if (!alive) return
      if (u) setUrl(u)
      else setFailed(true)
    })
    return () => {
      alive = false
      // libère la copie locale affichée (photo pas encore envoyée)
      if (created) URL.revokeObjectURL(created)
    }
  }, [path])
  if (failed) return <span className="text-xs text-ink-soft p-2 text-center">📤 Photo en route (visible dès qu’elle sera envoyée)</span>
  if (!url) return <span className="size-6 rounded-full border-[3px] border-line border-r-transparent animate-spin" aria-label="Chargement" />
  return <img src={url} alt={alt} className={className} loading="lazy" />
}
