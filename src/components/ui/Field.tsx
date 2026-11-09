import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const base =
  'w-full min-w-0 min-h-13 rounded-2xl bg-surface-2 text-ink placeholder:text-ink-soft/70 px-4 py-3 border-2 border-transparent focus:border-primary focus:outline-none'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

/** Champ texte avec libellé explicite (accessibilité) et police ≥ 16 px (pas de zoom iOS). */
export function Field({ label, hint, className = '', ...rest }: FieldProps) {
  const id = useId()
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="block font-bold mb-1.5 px-1">
        {label}
      </label>
      <input id={id} {...rest} className={base} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-soft mt-1 px-1">
          {hint}
        </p>
      )}
    </div>
  )
}

interface AreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

export function TextArea({ label, className = '', ...rest }: AreaProps) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-bold mb-1.5 px-1">
        {label}
      </label>
      <textarea id={id} rows={3} {...rest} className={`${base} resize-none`} />
    </div>
  )
}
