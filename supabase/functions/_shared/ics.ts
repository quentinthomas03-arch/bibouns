/**
 * Générateur iCalendar (RFC 5545) minimal pour l'abonnement « Calendrier iPhone ».
 * Heures en UTC, échappement et pliage des lignes à 75 octets conformes.
 */

export interface CalEvent {
  uid: string
  title: string
  /** ISO date-heure (événement daté) ou AAAA-MM-JJ (journée entière) */
  start: string
  end?: string
  allDay?: boolean
  location?: string | null
  description?: string | null
  /** rappels : minutes avant le début */
  alarms?: number[]
}

const enc = new TextEncoder()

export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Plie une ligne en morceaux de 75 octets max (sans couper un caractère UTF-8). */
export function foldLine(line: string): string {
  if (enc.encode(line).length <= 75) return line
  const parts: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const b = enc.encode(ch).length
    const limit = parts.length === 0 ? 75 : 74 // les lignes de continuation commencent par un espace
    if (bytes + b > limit) {
      parts.push(cur)
      cur = ''
      bytes = 0
    }
    cur += ch
    bytes += b
  }
  parts.push(cur)
  return parts.join('\r\n ')
}

const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const day = (d: string) => d.slice(0, 10).replace(/-/g, '')
function nextDay(d: string): string {
  const t = new Date(d.slice(0, 10) + 'T12:00:00Z')
  t.setUTCDate(t.getUTCDate() + 1)
  return t.toISOString().slice(0, 10)
}

export function buildCalendar(name: string, events: CalEvent[], now = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', "PRODID:-//Bibouns//FR", 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${escapeText(name)}`, 'X-WR-TIMEZONE:Europe/Paris', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H']
  const stamp = utc(now.toISOString())
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${stamp}`)
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${day(e.start)}`, `DTEND;VALUE=DATE:${day(e.end ?? nextDay(e.start))}`, 'TRANSP:TRANSPARENT')
    } else {
      const end = e.end ?? new Date(Date.parse(e.start) + 60 * 60_000).toISOString()
      lines.push(`DTSTART:${utc(e.start)}`, `DTEND:${utc(end)}`)
    }
    lines.push(`SUMMARY:${escapeText(e.title)}`)
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`)
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`)
    for (const m of e.alarms ?? []) {
      if (!m) continue
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(e.title)}`, `TRIGGER:-PT${Math.round(m)}M`, 'END:VALARM')
    }
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}
