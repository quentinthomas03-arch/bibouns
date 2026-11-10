import { useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from 'react'
import { Trash2 } from 'lucide-react'

const OPEN = -96

/**
 * Ligne qu'on glisse vers la gauche pour faire apparaître « Supprimer »
 * (comme dans Mail). Le défilement vertical reste libre.
 */
export function SwipeRow({ children, onDelete, label = 'Supprimer', className = '' }: { children: ReactNode; onDelete: () => void; label?: string; className?: string }) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; base: number } | null>(null)
  const moved = useRef(false)

  const down = (e: RPointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, base: dx }
    moved.current = false
  }
  const move = (e: RPointerEvent) => {
    const s = start.current
    if (!s) return
    const ddx = e.clientX - s.x
    const ddy = e.clientY - s.y
    if (!dragging) {
      if (Math.abs(ddy) > 10 && Math.abs(ddy) > Math.abs(ddx)) return (start.current = null) // défilement vertical
      if (Math.abs(ddx) < 10) return
      setDragging(true)
      moved.current = true
    }
    setDx(Math.max(OPEN - 20, Math.min(0, s.base + ddx)))
  }
  const up = () => {
    if (dragging) setDx((d) => (d < OPEN / 2 ? OPEN : 0))
    setDragging(false)
    start.current = null
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl ${className}`}>
      <button
        type="button"
        aria-label={label}
        tabIndex={dx === OPEN ? 0 : -1}
        onClick={() => {
          setDx(0)
          onDelete()
        }}
        className="absolute inset-y-0 right-0 w-24 bg-danger text-white font-bold flex flex-col items-center justify-center gap-1 text-sm"
      >
        <Trash2 size={20} aria-hidden /> {label}
      </button>
      <div
        className="relative touch-pan-y"
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? 'none' : 'transform .2s ease' }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClickCapture={(e) => {
          // un glissement ne doit pas déclencher le tap de la ligne
          if (moved.current) {
            e.stopPropagation()
            e.preventDefault()
            moved.current = false
          } else if (dx !== 0) {
            e.stopPropagation()
            setDx(0)
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}
