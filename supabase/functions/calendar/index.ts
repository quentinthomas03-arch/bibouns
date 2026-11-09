// =============================================================================
// Fonction "calendar" : abonnement Calendrier iPhone (lecture seule).
//   GET /functions/v1/calendar?t=<jeton personnel>
// Renvoie les rendez-vous (grossesse et bébé), les échéances des listes et
// les vaccins conseillés du foyer au format iCalendar.
// =============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildCalendar, type CalEvent } from '../_shared/ics.ts'
import { VACCINE_DOSES } from '../_shared/vaccines.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')!

async function sha256Hex(s: string): Promise<string> {
  const normalized = s.replace(/[^A-Za-z0-9]/g, '').toUpperCase() // identique à hash_code() en SQL
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized))
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('')
}

function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('t') ?? ''
  if (token.length < 20) return new Response('Lien invalide', { status: 404 })
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const { data: tok } = await db.from('calendar_tokens').select('member_id').eq('token_hash', await sha256Hex(token)).maybeSingle()
  if (!tok) return new Response('Lien invalide ou désactivé', { status: 404 })
  const { data: member } = await db.from('members').select('household_id').eq('id', tok.member_id).single()
  const hid = member!.household_id as string

  const since = new Date(Date.now() - 90 * 86_400_000).toISOString()
  const [appts, items, babies, vaccines] = await Promise.all([
    db.from('appointments').select('id, subject, title, starts_at, location, notes, questions, remind_minutes').eq('household_id', hid).is('deleted_at', null).gte('starts_at', since),
    db.from('checklist_items').select('id, label, due_date, done').eq('household_id', hid).is('deleted_at', null).eq('done', false).not('due_date', 'is', null),
    db.from('babies').select('first_name, born_at').eq('household_id', hid).is('deleted_at', null).limit(1),
    db.from('vaccines').select('code, done_on').eq('household_id', hid).is('deleted_at', null),
  ])

  const events: CalEvent[] = []
  for (const a of appts.data ?? []) {
    const questions = (a.questions ?? '').trim()
    events.push({
      uid: `rdv-${a.id}@bibouns`,
      title: `${a.subject === 'baby' ? '👶' : '🤰'} ${a.title}`,
      start: a.starts_at,
      location: a.location,
      description: [questions && `Questions à poser :\n${questions}`, a.notes].filter(Boolean).join('\n\n') || null,
      alarms: a.remind_minutes ?? [],
    })
  }
  for (const i of items.data ?? []) {
    events.push({ uid: `tache-${i.id}@bibouns`, title: `📌 ${i.label}`, start: i.due_date, allDay: true })
  }
  const baby = babies.data?.[0]
  if (baby?.born_at) {
    const birth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(baby.born_at))
    const done = new Set((vaccines.data ?? []).filter((v) => v.done_on).map((v) => v.code))
    const byDate = new Map<string, string[]>()
    for (const v of VACCINE_DOSES) if (!done.has(v.code)) byDate.set(addMonths(birth, v.months), [...(byDate.get(addMonths(birth, v.months)) ?? []), v.label])
    for (const [date, labels] of byDate) {
      events.push({ uid: `vaccins-${date}@bibouns`, title: `💉 Vaccins conseillés${baby.first_name ? ` (${baby.first_name})` : ''}`, start: date, allDay: true, description: `${labels.join('\n')}\n\nDate indicative : le médecin et le carnet de santé font foi.` })
    }
  }

  return new Response(buildCalendar("Biboun's", events), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="bibouns.ics"', 'Cache-Control': 'no-store' },
  })
})
