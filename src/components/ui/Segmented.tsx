interface Option<T extends string> {
  value: T
  label: string
}

/** Choix exclusif sous forme de pastilles (ex. Auto / Clair / Veilleuse). */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: Option<T>[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-2xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`press flex-1 min-h-11 rounded-xl font-bold transition-colors ${value === o.value ? 'bg-surface shadow-soft text-ink' : 'text-ink-soft'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
