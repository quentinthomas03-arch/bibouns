import { describe, expect, it } from 'vitest'
import { buildCalendar, escapeText, foldLine } from '../supabase/functions/_shared/ics'

describe('abonnement calendrier (ICS)', () => {
  const cal = buildCalendar(
    "Biboun's",
    [
      { uid: 'appt-1@bibouns', title: '2e écho, enfin !', start: '2026-12-08T13:30:00Z', location: 'Cabinet; rue des Lilas', description: 'Questions :\nPéridurale ?', alarms: [1440, 120] },
      { uid: 'vax-1@bibouns', title: '💉 Vaccins', start: '2027-07-04', allDay: true },
    ],
    new Date('2026-11-09T10:00:00Z'),
  )
  const lines = cal.split('\r\n')
  it('structure et fins de ligne CRLF', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(cal.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(cal.match(/BEGIN:VEVENT/g)).toHaveLength(2)
  })
  it('heures en UTC, durée 1 h par défaut', () => {
    expect(lines).toContain('DTSTART:20261208T133000Z')
    expect(lines).toContain('DTEND:20261208T143000Z')
  })
  it('journée entière', () => {
    expect(lines).toContain('DTSTART;VALUE=DATE:20270704')
    expect(lines).toContain('DTEND;VALUE=DATE:20270705')
  })
  it('rappels', () => {
    expect(lines).toContain('TRIGGER:-PT1440M')
    expect(lines).toContain('TRIGGER:-PT120M')
  })
  it('échappement', () => {
    expect(escapeText('a;b,c\\d\ne')).toBe('a\;b\\,c\\\\d\\ne')
    expect(lines).toContain('LOCATION:Cabinet\; rue des Lilas')
    expect(lines).toContain('SUMMARY:2e écho\\, enfin !')
  })
  it('pliage à 75 octets sans couper les caractères accentués', () => {
    const long = 'DESCRIPTION:' + 'é'.repeat(100)
    const folded = foldLine(long).split('\r\n')
    for (const l of folded) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75)
    expect(folded.slice(1).every((l) => l.startsWith(' '))).toBe(true)
    expect(folded.map((l, i) => (i ? l.slice(1) : l)).join('')).toBe(long)
  })
})

describe('jeton du calendrier', () => {
  it('même empreinte que hash_code() en SQL (normalisation puis SHA-256)', async () => {
    const normalized = 'ab-cde 2'.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized))
    expect(Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('')).toBe('f2e4d1e8ff91e67db4350481b3fd58b86dfd8d5168f9463bdb4ed46fdea65464')
  })
})
