import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Panneau qui monte du bas de l'écran (pratique à une main). */
export function Sheet({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Fermer" className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        className="relative w-full max-w-lg bg-bg rounded-t-[2rem] pt-3 px-5 pb-safe animate-slide-up max-h-[92dvh] overflow-y-auto outline-none"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-line mb-3" aria-hidden />
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="press size-11 grid place-items-center rounded-full bg-surface-2">
            <X size={22} />
          </button>
        </div>
        <div className="pb-6">{children}</div>
      </div>
    </div>
  )
}
