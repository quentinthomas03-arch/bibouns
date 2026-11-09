import { normName } from '@/content/nameOrigins'

/**
 * Test de compatibilité prénom + nom de famille : simple et amusant,
 * basé sur des règles de sonorité. Score toujours bienveillant (45 à 99).
 */

const VOWELS = 'aeiouyàâäéèêëîïôöùûüœæ'

/** Nombre approximatif de syllabes orales (le "e" final muet ne compte pas). */
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüœæç]/g, ' ')
  let total = 0
  for (const part of w.split(' ').filter(Boolean)) {
    let p = part.replace(/(?<=[^aeiouy])es?$/, '') // e/es final muet
    if (!p) p = part
    // Unités vocaliques : digrammes (ou, au, eau, ai, ei, eu, oi, œu) = 1 son,
    // sinon chaque voyelle compte (Lou-ise, Ga-bri-el, Ra-pha-ël).
    const units = p.match(new RegExp(`eau|œu|ou|au|ai|ei|eu|oi|[${VOWELS}]`, 'g')) ?? []
    total += Math.max(1, units.length)
  }
  return total
}

const startsWithVowelSound = (w: string) => /^[aeiouyh]/.test(normName(w))
const endsWithVowelSound = (w: string) => {
  const n = normName(w)
  // finales consonnes muettes courantes (Louis, Thomas, Arnaud…)
  if (/(s|t|d|x|z)$/.test(n) && /[aeiou](s|t|d|x|z)$/.test(n)) return true
  return /[aeiouy]$/.test(n)
}
const lastSound = (w: string) => normName(w).replace(/e?s?$/, '').slice(-2)
const firstSound = (w: string) => normName(w).slice(0, 2)

/** Initiales qui forment un sigle… gênant. */
const AWKWARD_INITIALS: Record<string, string> = {
  PQ: 'P.Q. … comme le papier. On assume ?',
  WC: 'W.C. … les initiales seront célèbres à la récré.',
  CC: 'C.C. … comme « coucou » ? Mignon.',
  FN: 'F.N. … à éviter sur les valises.',
  PD: 'P.D. … gare aux moqueries.',
  QQ: 'Q.Q. … original !',
  BG: 'B.G. … ego garanti.',
  OK: 'O.K. … tout roule !',
  VIP: 'V.I.P. … rien que ça.',
}

export interface CompatResult {
  score: number
  emoji: string
  verdict: string
  notes: string[]
  initials: string
}

export function compatibility(firstName: string, familyName: string): CompatResult {
  const notes: string[] = []
  let score = 80
  const sF = syllables(firstName)
  const sL = syllables(familyName)
  const total = sF + sL
  const initials = (firstName.split(/[-\s]/).map((p) => p[0] ?? '').join('') + familyName.split(/[-\s]/).map((p) => p[0] ?? '').join('')).toUpperCase()

  // Rythme
  if (sF !== sL) {
    score += 6
    notes.push(`🎵 Rythme ${sF}-${sL} : ça chante, ça balance.`)
  } else {
    notes.push(`🥁 Rythme régulier ${sF}-${sL} : carré, efficace.`)
  }
  if (total > 7) {
    score -= 6
    notes.push('📏 Un peu long à crier au parc… mais très chic sur un diplôme.')
  } else if (total <= 2) {
    score -= 3
    notes.push('⚡ Ultra court : on le retient en une seconde.')
  }

  // Enchaînement voyelle → voyelle (hiatus)
  if (endsWithVowelSound(firstName) && startsWithVowelSound(familyName)) {
    score -= 8
    notes.push('💨 Voyelle contre voyelle : petit hiatus, ça se prononce d’un souffle.')
  }

  // Écho : fin du prénom = début du nom
  if (lastSound(firstName) === firstSound(familyName)) {
    score -= 7
    notes.push('🔁 Écho entre la fin du prénom et le début du nom : effet « bégaiement ».')
  }

  // Rime
  const endF = normName(firstName).slice(-3)
  const endL = normName(familyName).slice(-3)
  if (endF.length === 3 && endF === endL) {
    score -= 4
    notes.push('🎤 Ça rime ! Parfait pour une chanson, moins pour l’appel en classe.')
  }

  // Allitération
  if (normName(firstName)[0] === normName(familyName)[0]) {
    score += 5
    notes.push('✨ Allitération : même initiale, effet super-héros garanti.')
  }

  // Initiales
  const key = Object.keys(AWKWARD_INITIALS).find((k) => initials === k)
  if (key) {
    score -= 10
    notes.push(`🔤 ${AWKWARD_INITIALS[key]}`)
  } else {
    notes.push(`🔤 Initiales ${initials.split('').join('.')}. : rien à signaler.`)
  }

  // Bonus porte-bonheur déterministe (pour le fun, entre 0 et 6)
  let h = 0
  for (const ch of normName(firstName + familyName)) h = (h * 31 + ch.charCodeAt(0)) % 997
  score += h % 7

  score = Math.max(45, Math.min(99, score))
  const [emoji, verdict] =
    score >= 90 ? ['💘', 'Coup de foudre sonore !'] : score >= 80 ? ['🧡', 'Très jolie association'] : score >= 70 ? ['🙂', 'Ça fonctionne bien'] : score >= 60 ? ['🤔', 'À dire à voix haute plusieurs fois'] : ['😅', 'Original… très original']
  return { score, emoji, verdict, notes, initials }
}
