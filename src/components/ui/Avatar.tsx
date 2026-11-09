interface Props {
  emoji: string
  color: string
  size?: number
  label?: string
  ring?: boolean
}

/** Avatar d'un membre : emoji sur une pastille de sa couleur. */
export function Avatar({ emoji, color, size = 40, label, ring }: Props) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      className={`inline-grid place-items-center rounded-full shrink-0 ${ring ? 'ring-3 ring-surface' : ''}`}
      style={{ width: size, height: size, background: color, fontSize: size * 0.55 }}
    >
      <span aria-hidden>{emoji}</span>
    </span>
  )
}
