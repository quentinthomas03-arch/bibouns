/** Saisie souple de la tension : "12/8", "12,5/8", "120/80" → mmHg. */
export function parseBloodPressure(input: string): { sys: number; dia: number } | null {
  const m = input.replace(/\s/g, '').replace(/,/g, '.').match(/^(\d+(?:\.\d+)?)[/-](\d+(?:\.\d+)?)$/)
  if (!m) return null
  let sys = parseFloat(m[1])
  let dia = parseFloat(m[2])
  // Notation française en cmHg ("12/8")
  if (sys < 30) sys *= 10
  if (dia < 30) dia *= 10
  if (sys < 60 || sys > 250 || dia < 30 || dia > 160 || dia >= sys) return null
  return { sys: Math.round(sys), dia: Math.round(dia) }
}

export const formatBP = (sys: number, dia: number) => `${sys}/${dia} mmHg`

/** "65,4" → 65.4 kg (entre 30 et 200 kg). */
export function parseWeight(input: string): number | null {
  const v = parseFloat(input.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(v) && v >= 30 && v <= 200 ? Math.round(v * 10) / 10 : null
}
