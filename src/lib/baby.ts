/**
 * Logique du suivi bébé : résumés, nuits, chronos, répartition des tâches.
 * Fonctions pures (testées) ; les dates sont en heure locale du téléphone.
 */

export type EventKind = 'feed' | 'diaper' | 'sleep' | 'med'

export interface FeedData {
  mode: 'breast' | 'bottle'
  side?: 'L' | 'R'
  ml?: number
  milk?: 'maternel' | 'infantile'
}
export interface DiaperData {
  pee: boolean
  poo: boolean
  color?: string
  texture?: string
}
export interface MedData {
  name: string
}

export interface BabyEvent {
  id: string
  kind: EventKind
  started_at: string
  ended_at?: string | null
  data: Partial<FeedData & DiaperData & MedData>
  created_by?: string | null
  deleted_at?: string | null
}

const MIN = 60_000

export const minutesBetween = (a: string, b: string) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / MIN))

/** Début (00:00 local) du jour contenant `d`. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes())

/** Minutes d'un intervalle [a, b] comprises dans [from, to]. */
export function overlapMinutes(a: number, b: number, from: number, to: number): number {
  return Math.max(0, Math.round((Math.min(b, to) - Math.max(a, from)) / MIN))
}

export interface DaySummary {
  feeds: number
  bottles: number
  bottleMl: number
  breastFeeds: number
  breastMinutes: number
  diapers: number
  pees: number
  poos: number
  sleepMinutes: number
  meds: number
}

/** Résumé d'une journée (minuit → minuit). Les chronos en cours comptent jusqu'à `now`. */
export function daySummary(events: BabyEvent[], day: Date, now: Date = new Date()): DaySummary {
  const from = startOfDay(day).getTime()
  const to = addDays(startOfDay(day), 1).getTime()
  const s: DaySummary = { feeds: 0, bottles: 0, bottleMl: 0, breastFeeds: 0, breastMinutes: 0, diapers: 0, pees: 0, poos: 0, sleepMinutes: 0, meds: 0 }
  for (const e of events) {
    if (e.deleted_at) continue
    const a = Date.parse(e.started_at)
    const b = e.ended_at ? Date.parse(e.ended_at) : Math.min(now.getTime(), to)
    const inDay = a >= from && a < to
    switch (e.kind) {
      case 'feed':
        if (!inDay) break
        s.feeds++
        if (e.data.mode === 'bottle') {
          s.bottles++
          s.bottleMl += e.data.ml ?? 0
        } else {
          s.breastFeeds++
          s.breastMinutes += Math.round((b - a) / MIN)
        }
        break
      case 'diaper':
        if (!inDay) break
        s.diapers++
        if (e.data.pee) s.pees++
        if (e.data.poo) s.poos++
        break
      case 'sleep':
        s.sleepMinutes += overlapMinutes(a, b, from, to)
        break
      case 'med':
        if (inDay) s.meds++
        break
    }
  }
  return s
}

/** Dernier événement d'un type (le plus récent par heure de début). */
export function lastOf<T extends BabyEvent>(events: T[], kind: EventKind, pred?: (e: T) => boolean): T | undefined {
  let best: T | undefined
  for (const e of events) {
    if (e.deleted_at || e.kind !== kind || (pred && !pred(e))) continue
    if (!best || e.started_at > best.started_at) best = e
  }
  return best
}

/** Chrono en cours (tétée ou sommeil sans heure de fin). */
export function running<T extends BabyEvent>(events: T[], kind: 'feed' | 'sleep'): T | undefined {
  return lastOf(events, kind, (e) => !e.ended_at && (kind === 'sleep' || e.data.mode === 'breast'))
}

/** Côté conseillé pour la prochaine tétée : l'autre côté que la dernière fois. */
export function nextSide(events: BabyEvent[]): 'L' | 'R' {
  const last = lastOf(events, 'feed', (e) => e.data.mode === 'breast')
  return last?.data.side === 'L' ? 'R' : 'L'
}

/** Quantité du dernier biberon (pour proposer la même en 1 tap). */
export function lastBottleMl(events: BabyEvent[], fallback = 90): number {
  return lastOf(events, 'feed', (e) => e.data.mode === 'bottle' && !!e.data.ml)?.data.ml ?? fallback
}

// ------------------------------------------------------------------ nuits
export interface NightSegment {
  /** minutes depuis le début de la nuit (19:00) */
  from: number
  to: number
}
export interface Night {
  date: Date // jour où la nuit commence
  segments: NightSegment[]
  sleepMinutes: number
  wakeUps: number
}

export const NIGHT_START_HOUR = 19
export const NIGHT_LENGTH_MIN = 12 * 60 // 19:00 → 07:00

/** Les `count` dernières nuits (19 h → 7 h), de la plus ancienne à la plus récente. */
export function nights(events: BabyEvent[], count: number, now: Date = new Date()): Night[] {
  const sleeps = events.filter((e) => e.kind === 'sleep' && !e.deleted_at)
  // La nuit "courante" est celle qui a commencé le plus récemment avant maintenant.
  let lastStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), NIGHT_START_HOUR)
  if (lastStart.getTime() > now.getTime()) lastStart = addDays(lastStart, -1)
  const out: Night[] = []
  for (let i = count - 1; i >= 0; i--) {
    const start = addDays(lastStart, -i)
    const from = start.getTime()
    const to = from + NIGHT_LENGTH_MIN * MIN
    const segments: NightSegment[] = []
    for (const e of sleeps) {
      const a = Date.parse(e.started_at)
      const b = e.ended_at ? Date.parse(e.ended_at) : now.getTime()
      if (b <= from || a >= to) continue
      segments.push({ from: Math.round((Math.max(a, from) - from) / MIN), to: Math.round((Math.min(b, to) - from) / MIN) })
    }
    segments.sort((x, y) => x.from - y.from)
    const sleepMinutes = segments.reduce((s, g) => s + (g.to - g.from), 0)
    out.push({ date: startOfDay(start), segments, sleepMinutes, wakeUps: Math.max(0, segments.length - 1) })
  }
  return out
}

// ------------------------------------------------------------------ qui fait quoi
export interface ShareStats {
  memberId: string
  total: number
  feeds: number
  diapers: number
  meds: number
  nightActions: number
}

/** Heure "de nuit" pour la répartition des réveils : 22 h → 6 h. */
export const isNightTime = (iso: string) => {
  const h = new Date(iso).getHours()
  return h >= 22 || h < 6
}

/**
 * Répartition des soins (repas, couches, médicaments) par membre depuis `since`.
 * Le sommeil n'est pas compté (c'est bébé qui dort !), mais le coucher/réveil
 * enregistré la nuit compte comme une action de nuit.
 */
export function shareStats(events: BabyEvent[], memberIds: string[], since: Date): ShareStats[] {
  const stats = new Map(memberIds.map((id) => [id, { memberId: id, total: 0, feeds: 0, diapers: 0, meds: 0, nightActions: 0 }]))
  for (const e of events) {
    if (e.deleted_at || !e.created_by || Date.parse(e.started_at) < since.getTime()) continue
    const s = stats.get(e.created_by)
    if (!s) continue
    if (e.kind === 'feed') s.feeds++
    if (e.kind === 'diaper') s.diapers++
    if (e.kind === 'med') s.meds++
    if (e.kind !== 'sleep') s.total++
    if (isNightTime(e.started_at)) s.nightActions++
  }
  return [...stats.values()]
}

/** Message bienveillant selon l'équilibre (jamais culpabilisant). */
export function balanceMessage(stats: ShareStats[], names: Record<string, string>): string {
  const total = stats.reduce((s, x) => s + x.total, 0)
  if (total < 5) return 'Pas encore assez de données : on regarde ça dans quelques jours 🌱'
  const [a, b] = [...stats].sort((x, y) => y.total - x.total)
  if (!b) return 'Super équipe en solo !'
  const share = a.total / total
  if (share <= 0.6) return 'Belle équipe : la charge est bien partagée 🤝'
  return `${names[a.memberId] ?? 'L’un de vous'} assure beaucoup en ce moment : un relais câlin, peut-être ? 💛`
}

// ------------------------------------------------------------------ formats
export function formatDuration(min: number): string {
  if (min < 1) return 'moins d’1 min'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const min = Math.round((now.getTime() - Date.parse(iso)) / MIN)
  if (min < 1) return 'à l’instant'
  return `il y a ${formatDuration(min)}`
}

export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
