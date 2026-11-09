/**
 * Biboun, la mascotte : une petite boule terracotta avec une feuille d'automne.
 * Humeurs : happy, sleepy (la nuit), wow (célébration), love.
 */
export type BibounMood = 'happy' | 'sleepy' | 'wow' | 'love'

interface Props {
  mood?: BibounMood
  size?: number
  className?: string
  /** couleur du corps (par défaut terracotta) */
  color?: string
  title?: string
}

export function Biboun({ mood = 'happy', size = 120, className = '', color = '#D9734E', title }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {/* ombre */}
      <ellipse cx="60" cy="110" rx="30" ry="5" fill="currentColor" opacity="0.08" />
      {/* feuille */}
      <path d="M60 26 C 58 14, 66 6, 78 6 C 78 18, 70 26, 60 26 Z" fill="#E3AD4F" />
      <path d="M60 26 C 64 18, 70 12, 76 9" stroke="#B9822E" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M60 30 L 60 22" stroke="#8C5A3C" strokeWidth="3" strokeLinecap="round" />
      {/* corps */}
      <path d="M60 24 C 92 24, 104 50, 102 74 C 100 98, 82 106, 60 106 C 38 106, 20 98, 18 74 C 16 50, 28 24, 60 24 Z" fill={color} />
      {/* reflet */}
      <ellipse cx="40" cy="48" rx="9" ry="6" fill="#fff" opacity="0.25" transform="rotate(-25 40 48)" />
      {/* ventre */}
      <ellipse cx="60" cy="91" rx="22" ry="13" fill="#F7D3BF" opacity="0.9" />
      {/* joues */}
      <ellipse cx="34" cy="70" rx="7" ry="4.5" fill="#F09A8F" opacity="0.85" />
      <ellipse cx="86" cy="70" rx="7" ry="4.5" fill="#F09A8F" opacity="0.85" />
      {/* yeux */}
      {mood === 'sleepy' ? (
        <g stroke="#3A2621" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M38 60 Q 44 65 50 60" />
          <path d="M70 60 Q 76 65 82 60" />
        </g>
      ) : mood === 'love' ? (
        <g fill="#B04E2C">
          <path d="M44 66 l-6 -6 a4 4 0 0 1 6 -5 a4 4 0 0 1 6 5 z" />
          <path d="M76 66 l-6 -6 a4 4 0 0 1 6 -5 a4 4 0 0 1 6 5 z" />
        </g>
      ) : (
        <g className="animate-blink">
          <ellipse cx="44" cy="60" rx="5" ry={mood === 'wow' ? 7 : 6} fill="#3A2621" />
          <ellipse cx="76" cy="60" rx="5" ry={mood === 'wow' ? 7 : 6} fill="#3A2621" />
          <circle cx="46" cy="57.5" r="1.8" fill="#fff" />
          <circle cx="78" cy="57.5" r="1.8" fill="#fff" />
        </g>
      )}
      {/* bouche */}
      {mood === 'wow' ? (
        <ellipse cx="60" cy="74" rx="5" ry="6" fill="#3A2621" />
      ) : mood === 'sleepy' ? (
        <path d="M55 74 Q 60 77 65 74" stroke="#3A2621" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M52 71 Q 60 80 68 71" stroke="#3A2621" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}
      {mood === 'sleepy' && (
        <text x="88" y="40" fontFamily="sans-serif" fontWeight="700" fontSize="14" fill="currentColor" opacity="0.5">z</text>
      )}
    </svg>
  )
}
