import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'soft' | 'ghost' | 'danger' | 'outline'
type Size = 'md' | 'lg' | 'xl'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
  loading?: boolean
  icon?: ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-ink shadow-soft',
  soft: 'bg-primary-soft text-ink',
  ghost: 'bg-transparent text-ink',
  outline: 'bg-surface text-ink border-2 border-line',
  danger: 'bg-transparent text-danger border-2 border-danger/40',
}
const sizes: Record<Size, string> = {
  md: 'min-h-11 px-4 rounded-2xl text-base',
  lg: 'min-h-14 px-5 rounded-3xl text-lg',
  xl: 'min-h-16 px-6 rounded-[1.75rem] text-xl',
}

/** Bouton principal : grandes zones tactiles (44 px minimum), retour visuel à l'appui. */
export function Button({ variant = 'primary', size = 'lg', block, loading, icon, className = '', children, disabled, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`press inline-flex items-center justify-center gap-2 font-bold select-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
    >
      {loading ? <span className="size-5 rounded-full border-[3px] border-current border-r-transparent animate-spin" /> : icon}
      {children}
    </button>
  )
}
