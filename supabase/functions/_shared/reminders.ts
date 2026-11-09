/**
 * Calcul des rappels à envoyer (fonctions pures, testées côté appli).
 * Appelé toutes les 5 minutes par la fonction "push".
 *   - rendez-vous : à l'heure choisie (la veille, 2 h avant…)
 *   - vaccins : 7 jours avant et le jour J, à 9 h (heure de Paris)
 *   - échéances des listes : 3 jours avant et le jour J, à 9 h
 * Chaque rappel a une clé unique : il n'est jamais envoyé deux fois.
 */

export interface Prefs {
  appointments: boolean
  vaccines: boolean
  deadlines: boolean
  assigned: boolean
  notes: boolean
}
export const DEFAULT_PREFS: Prefs = { appointments: true, vaccines: true, deadlines: true, assigned: true, notes: true }

export interface Reminder {
  key: string
  memberIds: string[]
  title: string
  body: string
  url: string
  category: keyof Prefs
}

export interface ReminderInput {
  now: Date
  members: { id: string; first_name: string }[]
  appointments: { id: string; title: string; starts_at: string; location?: string | null; remind_minutes: number[]; done?: boolean; subject: string }[]
  checklistItems: { id: string; label: string; due_date?: string | null; done: boolean; assignee?: string | null }[]
  baby: { first_name?: string | null; born_at?: string | null } | null
  vaccineDoses: { code: string; label: string; months: number }[]
  vaccinesDone: string[]
}

const TZ = 'Europe/Paris'
/** Fenêtre de rattrapage : le cron tourne toutes les 5 min, on tolère un retard. */
const WINDOW_MS = 15 * 60_000

/** Date (AAAA-MM-JJ) et heure à Paris. */
export function parisParts(d: Date): { date: string; hour: number } {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) }
}

const dayDiff = (a: string, b: string) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86_400_000)

function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10)
}

function when(minutes: number): string {
  if (minutes >= 2880) return 'dans 2 jours'
  if (minutes >= 1440) return 'demain'
  if (minutes >= 60) return `dans ${Math.round(minutes / 60)} h`
  return `dans ${minutes} min`
}

export function computeReminders(input: ReminderInput): Reminder[] {
  const out: Reminder[] = []
  const all = input.members.map((m) => m.id)
  const now = input.now.getTime()
  const { date: today, hour } = parisParts(input.now)
  const morning = hour === 9 // rappels "du jour" entre 9 h et 10 h, heure de Paris

  // Rendez-vous
  for (const a of input.appointments) {
    if (a.done) continue
    const start = Date.parse(a.starts_at)
    for (const m of a.remind_minutes ?? []) {
      if (!m) continue
      const fire = start - m * 60_000
      if (fire <= now && now - fire < WINDOW_MS && start > now) {
        const time = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(start))
        out.push({
          key: `appt:${a.id}:${m}:${a.starts_at}`,
          memberIds: all,
          title: `📅 ${a.title} ${when(m)}`,
          body: `À ${time}${a.location ? ` · ${a.location}` : ''}. Pensez à vos questions !`,
          url: a.subject === 'baby' ? './#/sante?tab=rdv' : './#/suivi?tab=rdv',
          category: 'appointments',
        })
      }
    }
  }

  if (!morning) return out

  // Vaccins (bébé né uniquement)
  if (input.baby?.born_at) {
    const birth = parisParts(new Date(input.baby.born_at)).date
    const byDue = new Map<string, string[]>()
    for (const v of input.vaccineDoses) {
      if (input.vaccinesDone.includes(v.code)) continue
      const due = addMonths(birth, v.months)
      byDue.set(due, [...(byDue.get(due) ?? []), v.label])
    }
    for (const [due, labels] of byDue) {
      const diff = dayDiff(due, today)
      if (diff !== 7 && diff !== 0) continue
      const name = input.baby.first_name || 'Bébé'
      out.push({
        key: `vax:${due}:${diff}`,
        memberIds: all,
        title: diff === 0 ? `💉 Vaccins conseillés aujourd’hui pour ${name}` : `💉 Vaccins de ${name} dans 7 jours`,
        body: `${labels.join(', ')}. Pensez à prendre rendez-vous et le carnet de santé.`,
        url: './#/sante?tab=vaccins',
        category: 'vaccines',
      })
    }
  }

  // Échéances des listes
  for (const it of input.checklistItems) {
    if (it.done || !it.due_date) continue
    const diff = dayDiff(it.due_date, today)
    if (diff !== 3 && diff !== 0) continue
    out.push({
      key: `item:${it.id}:${it.due_date}:${diff}`,
      memberIds: it.assignee ? [it.assignee] : all,
      title: diff === 0 ? '⏰ C’est pour aujourd’hui' : '⏰ Échéance dans 3 jours',
      body: it.label,
      url: './#/listes',
      category: 'deadlines',
    })
  }
  return out
}
