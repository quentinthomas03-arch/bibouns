import { Check } from 'lucide-react'

/** Rond à cocher (grande zone tactile). */
export function CheckCircle({ checked, onToggle, label, color }: { checked: boolean; onToggle: () => void; label: string; color?: string }) {
  return (
    <button type="button" aria-pressed={checked} aria-label={checked ? `Marquer « ${label} » comme à faire` : `Marquer « ${label} » comme fait`} onClick={onToggle} className="press size-11 shrink-0 -m-1 grid place-items-center">
      <span
        className={`size-8 rounded-full grid place-items-center border-[3px] transition-all ${checked ? 'border-transparent text-white animate-pop' : 'border-line bg-surface'}`}
        style={checked ? { background: color ?? 'var(--sage)' } : undefined}
      >
        {checked && <Check size={18} strokeWidth={3.5} />}
      </span>
    </button>
  )
}
