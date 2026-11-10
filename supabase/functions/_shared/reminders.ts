/**
 * Calcul des rappels à envoyer (fonctions pures, testées côté appli).
 * Appelé toutes les 5 minutes par la fonction "push".
 *   - rendez-vous : à l'heure choisie (la veille, 2 h avant…)
 *   - vaccins : 7 jours avant et le jour J, à 9 h (heure de Paris)
 *   - échéances des listes : 3 jours avant et le jour J, à 9 h
 *   - sauvegarde : le 1er de chaque mois, à 9 h
 * Chaque rappel a une clé unique : il n'est jamais envoyé deux fois.
 */

export interface Prefs {
  appointments: boolean
  vaccines: boolean
  deadlines: boolean
  assigned: boolean
  notes: boolean
  backup: boolean
  nights: boolean
  meds: boolean
}

export interface MedReminderCfg {
  enabled: boolean
  name: string
  /** "HH:MM", heure de Paris */
  time: string
}
export const DEFAULT_PREFS: Prefs = { appointments: true, vaccines: true, deadlines: true, assigned: true, notes: true, backup: true, nights: true, meds: true }

export interface NightShiftCfg {
  enabled: boolean
  startMember: string
  startDate: string
  overrides: Record<string, string>
}

/** Même règle que src/lib/nightshift.ts (vérifié par un test). */
export function onDuty(cfg: NightShiftCfg | null | undefined, members: string[], date: string): string | null {
  if (!cfg?.enabled || members.length < 2) return null
  if (cfg.overrides?.[date] && members.includes(cfg.overrides[date])) return cfg.overrides[date]
  const startIdx = Math.max(0, members.indexOf(cfg.startMember))
  const diff = dayDiff(date, cfg.startDate)
  return members[(((startIdx + diff) % members.length) + members.length) % members.length]
}

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
  nightShift?: NightShiftCfg | null
  medReminder?: MedReminderCfg | null
  /** soins (noms) déjà notés, avec leur heure de début (ISO) */
  medEvents?: { name: string; started_at: string }[]
}

const TZ = 'Europe/Paris'
/** Fenêtre de rattrapage : le cron tourne toutes les 5 min, on tolère un retard. */
const WINDOW_MS = 15 * 60_000

/** Date (AAAA-MM-JJ) et heure à Paris. */
export function parisParts(d: Date): { date: string; hour: number; minute: number } {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute) }
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
  const { date: today, hour, minute } = parisParts(input.now)
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

  // Rappel de soin (ex. vitamine) : à l'heure choisie, seulement s'il n'a pas été noté aujourd'hui
  const med = input.medReminder
  if (med?.enabled && med.name && input.baby?.born_at && /^\d{2}:\d{2}$/.test(med.time)) {
    const [h, m] = med.time.split(':').map(Number)
    const elapsed = hour * 60 + minute - (h * 60 + m)
    const given = (input.medEvents ?? []).some((e) => e.name.trim().toLowerCase() === med.name.trim().toLowerCase() && parisParts(new Date(e.started_at)).date === today)
    if (elapsed >= 0 && elapsed < 15 && !given) {
      out.push({ key: `med:${today}:${med.name.toLowerCase()}`, memberIds: all, title: `💊 ${med.name} pas encore notée`, body: 'Si c’est fait, notez-la dans l’appli (bouton +). Sinon, c’est le moment !', url: './#/', category: 'meds' })
    }
  }

  // Tour de garde : à 21 h, heure de Paris (bébé né uniquement)
  if (hour === 21 && input.baby?.born_at) {
    const ids = input.members.map((m) => m.id)
    const duty = onDuty(input.nightShift, ids, today)
    if (duty) {
      const name = input.members.find((m) => m.id === duty)?.first_name ?? ''
      out.push({ key: `night:${today}:duty`, memberIds: [duty], title: '🌙 C’est ton tour cette nuit', body: 'Mode nuit prêt dans l’appli. Courage, et bonne nuit quand même 💛', url: './#/nuit', category: 'nights' })
      const others = ids.filter((id) => id !== duty)
      if (others.length) out.push({ key: `night:${today}:rest`, memberIds: others, title: '😴 Repos cette nuit', body: `${name} veille sur Biboun. Profite pour dormir !`, url: './#/', category: 'nights' })
    }
  }

  if (!morning) return out

  // Rappel mensuel d'export (l'offre gratuite n'a pas de sauvegarde téléchargeable)
  if (today.endsWith('-01')) {
    out.push({
      key: `backup:${today.slice(0, 7)}`,
      memberIds: all,
      title: '💾 Petite sauvegarde du mois ?',
      body: 'Exportez vos données et vos photos (Réglages → Sauvegarde) et rangez le fichier dans iCloud Drive.',
      url: './#/sauvegarde',
      category: 'backup',
    })
  }

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
