import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={`bg-surface rounded-[var(--radius-blob)] shadow-soft p-5 ${className}`} />
}

export function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`font-display text-lg font-semibold text-ink-soft px-1 mb-2 mt-6 ${className}`}>{children}</h2>
}
