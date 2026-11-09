import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as RPointerEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowDown, ArrowUp, Heart, RotateCcw, SlidersHorizontal, Star, StickyNote, X, Plus, RefreshCw } from 'lucide-react'
import { Biboun } from '@/components/Biboun'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Field, TextArea } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/app/session'
import { useRows, useSetting, useStore, stableId } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'
import { supabase } from '@/lib/supabase'
import { compatibility } from '@/lib/compat'
import { DEFAULT_FILTERS, SEX_LABEL, buildDeck, matchesFilters, popularityLabel, toCard, trendLabel, type NameCard, type NameFilters, type RawName } from '@/lib/names'
import { ORIGIN_LIST, normName, originOf } from '@/content/nameOrigins'

type Tab = 'swipe' | 'matchs' | 'compat'
type Vote = 'like' | 'meh' | 'no'
interface VoteRow extends BaseRow {
  name: string
  vote: Vote
}
interface CustomName extends BaseRow {
  name: string
  gender: 'f' | 'm' | 'x' | null
  origin: string | null
}
interface MatchMeta extends BaseRow {
  name: string
  rank: number | null
  note: string | null
  star: boolean
}

const FILTERS_KEY = 'bibouns.nameFilters'

// ------------------------------------------------------------------ données
/** Charge la base INSEE à la demande (fichier séparé, ~37 Ko compressé). */
function useNameData() {
  const [data, setData] = useState<{ cards: NameCard[]; source: string } | null>(null)
  useEffect(() => {
    void import('@/content/names.json').then((m) => {
      const d = m.default as unknown as { meta: { source: string }; names: RawName[] }
      setData({ cards: d.names.map(toCard), source: d.meta.source })
    })
  }, [])
  return data
}

/**
 * Matchs = prénoms aimés par les deux. Calculés côté serveur (fonction
 * name_match_list) pour ne JAMAIS révéler les autres votes de l'autre.
 * Gardés en cache sur le téléphone pour l'affichage hors ligne.
 */
function useMatches(myLikes: string[]) {
  const { ctx } = useSession()
  const key = `bibouns.matches.${ctx?.householdId}`
  const [matches, setMatches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '[]')
    } catch {
      return []
    }
  })
  const [online, setOnline] = useState(true)
  const likesRef = useRef(myLikes)
  likesRef.current = myLikes

  const refresh = useCallback(async (): Promise<string[]> => {
    let list: string[]
    if (!supabase) {
      list = likesRef.current // mode démo
    } else {
      const { data, error } = await supabase.rpc('name_match_list')
      if (error) {
        setOnline(false)
        return matches
      }
      list = (data as { name: string }[]).map((r) => r.name)
    }
    setOnline(true)
    setMatches(list)
    try {
      localStorage.setItem(key, JSON.stringify(list))
    } catch {
      /* stockage plein */
    }
    return list
  }, [key, matches])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { matches, refresh, online }
}

// ------------------------------------------------------------------ écran
export function Names() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'swipe'
  const data = useNameData()
  const votes = useRows<VoteRow>('name_votes') ?? []
  const likes = useMemo(() => votes.filter((v) => v.vote === 'like').map((v) => v.name), [votes])
  const { matches, refresh, online } = useMatches(likes)

  return (
    <div className="px-4 pt-safe pb-tabbar max-w-lg mx-auto">
      <header className="flex items-center gap-2 pt-2">
        <Link to="/plus" aria-label="Retour" className="press size-11 grid place-items-center rounded-full bg-surface shadow-soft">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-3xl font-semibold flex-1">Prénoms</h1>
      </header>
      <div role="tablist" className="mt-3 flex gap-1 rounded-2xl bg-surface-2 p-1">
        {(
          [
            ['swipe', '💫 Swipe'],
            ['matchs', `💞 Matchs${matches.length ? ` (${matches.length})` : ''}`],
            ['compat', '🔮 Compat'],
          ] as [Tab, string][]
        ).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setParams({ tab: v }, { replace: true })} className={`press flex-1 min-h-11 rounded-xl text-sm font-bold ${tab === v ? 'bg-surface shadow-soft' : 'text-ink-soft'}`}>
            {l}
          </button>
        ))}
      </div>
      {!data ? (
        <div className="py-16 grid place-items-center">
          <Biboun size={90} className="animate-float" title="Chargement des prénoms" />
        </div>
      ) : tab === 'swipe' ? (
        <Swipe cards={data.cards} votes={votes} matches={matches} refreshMatches={refresh} source={data.source} />
      ) : tab === 'matchs' ? (
        <Matches matches={matches} refresh={refresh} online={online} cards={data.cards} />
      ) : (
        <Compat matches={matches} />
      )}
    </div>
  )
}

// ------------------------------------------------------------------ swipe
function Swipe({ cards, votes, matches, refreshMatches, source }: { cards: NameCard[]; votes: VoteRow[]; matches: string[]; refreshMatches: () => Promise<string[]>; source: string }) {
  const { save, remove, memberId } = useStore()
  const customs = useRows<CustomName>('custom_names') ?? []
  const [filters, setFilters] = useState<NameFilters>(() => {
    try {
      return { ...DEFAULT_FILTERS, ...JSON.parse(localStorage.getItem(FILTERS_KEY) ?? '{}') }
    } catch {
      return DEFAULT_FILTERS
    }
  })
  const [showFilters, setShowFilters] = useState(false)
  const [adding, setAdding] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [celebrate, setCelebrate] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify(filters))
    } catch {
      /* ignore */
    }
  }, [filters])

  const voted = useMemo(() => new Set(votes.map((v) => normName(v.name))), [votes])
  // Le paquet est figé tant que les filtres ne changent pas (sinon il se remélange à chaque vote)
  const deck = useMemo(() => {
    const customCards: NameCard[] = customs.map((c) => ({ name: c.name, sex: c.gender ?? 'x', recent: 0, peak: 0, trend: 0, origin: c.origin ?? originOf(c.name), custom: true }))
    const known = new Set(customCards.map((c) => normName(c.name)))
    const all = [...customCards, ...cards.filter((c) => !known.has(normName(c.name)))].filter((c) => matchesFilters(c, filters))
    return buildDeck(all, new Set(), `${memberId}:${JSON.stringify(filters)}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, customs.length, filters, memberId])
  const remaining = useMemo(() => deck.filter((c) => !voted.has(normName(c.name))), [deck, voted])
  const current = remaining[0]
  const next = remaining[1]

  async function vote(v: Vote) {
    if (!current) return
    const name = current.name
    await save('name_votes', { id: stableId(memberId, 'vote', normName(name)), name, vote: v, deleted_at: null })
    setHistory((h) => [name, ...h].slice(0, 20))
    if (v === 'like' && !matches.includes(name)) {
      const list = await refreshMatches()
      if (list.some((m) => normName(m) === normName(name)) && supabase) setCelebrate(name)
    }
  }

  async function undo() {
    const [last, ...rest] = history
    if (!last) return
    await remove('name_votes', stableId(memberId, 'vote', normName(last)))
    setHistory(rest)
  }

  const activeFilters = Object.entries(filters).filter(([k, v]) => v !== DEFAULT_FILTERS[k as keyof NameFilters]).length

  return (
    <section className="mt-4">
      <div className="flex items-center gap-2">
        <Button size="md" variant="outline" icon={<SlidersHorizontal size={18} />} onClick={() => setShowFilters(true)}>
          Filtres{activeFilters ? ` (${activeFilters})` : ''}
        </Button>
        <Button size="md" variant="outline" icon={<Plus size={18} />} onClick={() => setAdding(true)}>
          Ajouter
        </Button>
        <span className="ml-auto text-sm text-ink-soft font-semibold">{remaining.length.toLocaleString('fr-FR')} restants</span>
      </div>

      <div className="relative mt-4 h-[min(22rem,calc(100dvh-25rem))] min-h-64">
        {next && <NameCardView key={`n-${next.name}`} card={next} behind />}
        {current ? (
          <SwipeCard key={current.name} card={current} onVote={vote} />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <Biboun size={100} mood="wow" className="mx-auto" />
              <p className="font-display text-2xl mt-2">Plus de prénoms ici !</p>
              <p className="text-ink-soft">Élargis les filtres ou ajoute tes idées.</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-center gap-4">
        <RoundButton label="Annuler le dernier vote" onClick={undo} disabled={!history.length} small>
          <RotateCcw size={22} />
        </RoundButton>
        <RoundButton label="Non" onClick={() => vote('no')} disabled={!current} color="bg-surface text-danger">
          <X size={34} strokeWidth={3} />
        </RoundButton>
        <RoundButton label="Bof" onClick={() => vote('meh')} disabled={!current} color="bg-surface text-ink-soft" small>
          <span className="text-2xl">😐</span>
        </RoundButton>
        <RoundButton label="J’aime" onClick={() => vote('like')} disabled={!current} color="bg-primary text-primary-ink">
          <Heart size={32} strokeWidth={3} fill="currentColor" />
        </RoundButton>
      </div>
      <p className="text-center text-xs text-ink-soft mt-4">
        Chacun vote de son côté : vos choix restent secrets, seuls les « j’aime » communs deviennent des matchs.
        <br />
        Source : {source}.
      </p>

      <FiltersSheet open={showFilters} onClose={() => setShowFilters(false)} filters={filters} onChange={setFilters} />
      <AddNameSheet open={adding} onClose={() => setAdding(false)} />
      {celebrate && <MatchCelebration name={celebrate} onClose={() => setCelebrate(null)} />}
    </section>
  )
}

function RoundButton({ children, label, onClick, disabled, color = 'bg-surface', small }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; color?: string; small?: boolean }) {
  return (
    <button aria-label={label} onClick={onClick} disabled={disabled} className={`press rounded-full grid place-items-center shadow-soft disabled:opacity-40 ${color} ${small ? 'size-14' : 'size-20'}`}>
      {children}
    </button>
  )
}

const SEX_STYLE = { f: 'bg-rose', m: 'bg-sage', x: 'bg-apricot' } as const

function NameCardView({ card, behind, style, hint }: { card: NameCard; behind?: boolean; style?: React.CSSProperties; hint?: Vote | null }) {
  const trend = trendLabel(card)
  return (
    <div
      className={`absolute inset-0 rounded-[2rem] bg-surface shadow-soft p-6 flex flex-col overflow-hidden select-none ${behind ? 'scale-95 translate-y-3 opacity-70' : ''}`}
      style={style}
      aria-hidden={behind}
    >
      <div className={`absolute -top-16 -right-16 size-48 rounded-full opacity-60 ${SEX_STYLE[card.sex]}`} aria-hidden />
      <span className={`relative self-start rounded-full px-3 py-1 text-sm font-bold ${SEX_STYLE[card.sex]} text-ink`}>{SEX_LABEL[card.sex]}</span>
      <div className="relative flex-1 grid place-items-center text-center">
        <div>
          <p className="font-display font-semibold leading-none break-words" style={{ fontSize: card.name.length > 10 ? '2.6rem' : '3.6rem' }}>
            {card.name}
          </p>
          {card.origin && <p className="mt-3 text-ink-soft font-semibold">Origine {card.origin.toLowerCase()}</p>}
        </div>
      </div>
      <div className="relative flex flex-wrap gap-2 justify-center text-sm font-semibold">
        <span className="rounded-full bg-surface-2 px-3 py-1">{popularityLabel(card)}</span>
        {trend && <span className="rounded-full bg-surface-2 px-3 py-1">{trend}</span>}
      </div>
      {hint && (
        <span
          className={`absolute top-20 text-3xl font-display font-bold border-4 rounded-2xl px-3 py-1 rotate-[-12deg] ${hint === 'like' ? 'left-6 text-primary border-primary' : hint === 'no' ? 'right-6 rotate-[12deg] text-danger border-danger' : 'left-1/2 -translate-x-1/2 text-ink-soft border-ink-soft'}`}
        >
          {hint === 'like' ? 'J’AIME' : hint === 'no' ? 'NON' : 'BOF'}
        </span>
      )}
    </div>
  )
}

/** Carte à glisser : droite = j'aime, gauche = non, haut = bof. */
function SwipeCard({ card, onVote }: { card: NameCard; onVote: (v: Vote) => void }) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const [d, setD] = useState({ x: 0, y: 0 })
  const [leaving, setLeaving] = useState<Vote | null>(null)
  const TH = 90

  const hint: Vote | null = leaving ?? (d.x > 40 ? 'like' : d.x < -40 ? 'no' : d.y < -40 ? 'meh' : null)

  const onDown = (e: RPointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: RPointerEvent) => {
    if (!start.current) return
    setD({ x: e.clientX - start.current.x, y: e.clientY - start.current.y })
  }
  const onUp = () => {
    if (!start.current) return
    start.current = null
    const v: Vote | null = d.x > TH ? 'like' : d.x < -TH ? 'no' : d.y < -TH ? 'meh' : null
    if (!v) return setD({ x: 0, y: 0 })
    setLeaving(v)
    setD(v === 'like' ? { x: 500, y: d.y } : v === 'no' ? { x: -500, y: d.y } : { x: 0, y: -600 })
    setTimeout(() => onVote(v), 180)
  }

  return (
    <div
      className="absolute inset-0 touch-none cursor-grab animate-pop"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{ transform: `translate(${d.x}px, ${d.y}px) rotate(${d.x / 18}deg)`, transition: start.current ? 'none' : 'transform .2s ease' }}
    >
      <NameCardView card={card} hint={hint} />
    </div>
  )
}

function MatchCelebration({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Nouveau match" className="fixed inset-0 z-50 grid place-items-center bg-black/50 animate-fade-in p-6" onClick={onClose}>
      <div className="rounded-[2rem] bg-bg p-8 text-center animate-pop max-w-sm">
        <p className="text-5xl" aria-hidden>
          🎉💞🎉
        </p>
        <Biboun mood="love" size={110} className="mx-auto mt-2" />
        <p className="font-display text-3xl font-semibold mt-2">C’est un match !</p>
        <p className="text-ink-soft mt-1">Vous aimez tous les deux</p>
        <p className="font-display text-5xl text-primary font-semibold mt-2">{name}</p>
        <Button className="mt-6" block onClick={onClose}>
          Trop bien !
        </Button>
      </div>
    </div>
  )
}

function FiltersSheet({ open, onClose, filters, onChange }: { open: boolean; onClose: () => void; filters: NameFilters; onChange: (f: NameFilters) => void }) {
  const set = (p: Partial<NameFilters>) => onChange({ ...filters, ...p })
  const chip = (on: boolean) => `press min-h-11 px-4 rounded-full font-semibold text-sm ${on ? 'bg-ink text-bg' : 'bg-surface-2'}`
  return (
    <Sheet open={open} onClose={onClose} title="Filtres">
      <div className="flex flex-col gap-5">
        <Segmented<NameFilters['sex']>
          label="Genre"
          value={filters.sex}
          onChange={(sex) => set({ sex })}
          options={[
            { value: 'all', label: 'Tous' },
            { value: 'f', label: 'Fille' },
            { value: 'm', label: 'Garçon' },
            { value: 'x', label: 'Mixte' },
          ]}
        />
        <Segmented<NameFilters['length']>
          label="Longueur"
          value={filters.length}
          onChange={(length) => set({ length })}
          options={[
            { value: 'all', label: 'Toutes' },
            { value: 'short', label: '≤ 4' },
            { value: 'medium', label: '5–7' },
            { value: 'long', label: '8 +' },
          ]}
        />
        <fieldset>
          <legend className="font-bold mb-1.5 px-1">Style</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'Tous'],
                ['top', '🔥 Très donnés'],
                ['classic', '🌳 Classiques'],
                ['rare', '💎 Rares'],
                ['rising', '📈 En vogue'],
                ['retro', '🕰️ Rétro'],
              ] as [NameFilters['popularity'], string][]
            ).map(([v, l]) => (
              <button key={v} aria-pressed={filters.popularity === v} onClick={() => set({ popularity: v })} className={chip(filters.popularity === v)}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-bold mb-1.5 px-1">Origine (indicative)</legend>
          <div className="flex flex-wrap gap-2">
            <button aria-pressed={!filters.origin} onClick={() => set({ origin: null })} className={chip(!filters.origin)}>
              Toutes
            </button>
            {ORIGIN_LIST.map((o) => (
              <button key={o} aria-pressed={filters.origin === o} onClick={() => set({ origin: o })} className={chip(filters.origin === o)}>
                {o}
              </button>
            ))}
          </div>
          {filters.origin && <p className="text-xs text-ink-soft mt-1 px-1">Seuls les prénoms dont l’origine est renseignée apparaissent.</p>}
        </fieldset>
        <fieldset>
          <legend className="font-bold mb-1.5 px-1">Initiale</legend>
          <div className="grid grid-cols-7 gap-1.5">
            <button aria-pressed={!filters.initial} onClick={() => set({ initial: null })} className={`${chip(!filters.initial)} !px-0 col-span-2`}>
              Toutes
            </button>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => (
              <button key={l} aria-pressed={filters.initial === l} onClick={() => set({ initial: filters.initial === l ? null : l })} className={`${chip(filters.initial === l)} !px-0`}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onChange(DEFAULT_FILTERS)}>
            Réinitialiser
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Voir
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

function AddNameSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { save, householdId } = useStore()
  const toast = useToast()
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'f' | 'm' | 'x'>('x')
  async function submit(e: FormEvent) {
    e.preventDefault()
    const n = name.trim().replace(/\s+/g, ' ')
    if (!n) return
    const pretty = n.charAt(0).toUpperCase() + n.slice(1)
    await save('custom_names', { id: stableId(householdId, 'custom', normName(pretty)), name: pretty, gender, origin: originOf(pretty) ?? null, deleted_at: null })
    toast(`${pretty} ajouté au paquet ✍️`)
    setName('')
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Ajouter un prénom">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Prénom" value={name} onChange={(e) => setName(e.target.value)} placeholder="Une idée originale ?" autoFocus maxLength={40} />
        <Segmented<'f' | 'm' | 'x'>
          label="Pour"
          value={gender}
          onChange={setGender}
          options={[
            { value: 'f', label: 'Fille' },
            { value: 'm', label: 'Garçon' },
            { value: 'x', label: 'Les deux' },
          ]}
        />
        <p className="text-sm text-ink-soft">Il apparaîtra en premier dans le paquet de vous deux.</p>
        <Button type="submit" block>
          Ajouter
        </Button>
      </form>
    </Sheet>
  )
}

// ------------------------------------------------------------------ matchs
function Matches({ matches, refresh, online, cards }: { matches: string[]; refresh: () => Promise<string[]>; online: boolean; cards: NameCard[] }) {
  const metas = useRows<MatchMeta>('name_matches') ?? []
  const { save, householdId } = useStore()
  const [noting, setNoting] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [busy, setBusy] = useState(false)
  const byName = new Map(cards.map((c) => [normName(c.name), c]))
  const meta = (n: string) => metas.find((m) => normName(m.name) === normName(n))
  const metaId = (n: string) => stableId(householdId, 'match', normName(n))

  const sorted = [...matches].sort((a, b) => {
    const ma = meta(a)
    const mb = meta(b)
    return Number(!!mb?.star) - Number(!!ma?.star) || (ma?.rank ?? 1e9) - (mb?.rank ?? 1e9) || a.localeCompare(b, 'fr')
  })

  const upsert = (name: string, p: Partial<MatchMeta>) => {
    const m = meta(name)
    return save('name_matches', { id: metaId(name), name, rank: m?.rank ?? null, note: m?.note ?? null, star: m?.star ?? false, ...p })
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= sorted.length) return
    const order = [...sorted]
    ;[order[i], order[j]] = [order[j], order[i]]
    for (let k = 0; k < order.length; k++) if (meta(order[k])?.rank !== k) await upsert(order[k], { rank: k })
  }

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-ink-soft font-semibold">{matches.length ? `${matches.length} prénom${matches.length > 1 ? 's' : ''} aimé${matches.length > 1 ? 's' : ''} par vous deux` : ''}</p>
        <button
          onClick={async () => {
            setBusy(true)
            await refresh()
            setBusy(false)
          }}
          aria-label="Actualiser les matchs"
          className="press size-11 grid place-items-center rounded-full bg-surface shadow-soft"
        >
          <RefreshCw size={20} className={busy ? 'animate-spin' : ''} />
        </button>
      </div>
      {!online && <p className="mt-2 rounded-2xl bg-mustard/25 px-4 py-2 text-sm">Hors ligne : derniers matchs connus.</p>}
      {matches.length === 0 && (
        <div className="text-center py-10 flex flex-col items-center gap-2">
          <Biboun size={100} mood="love" />
          <p className="font-display text-2xl">Pas encore de match</p>
          <p className="text-ink-soft max-w-xs">Swipez chacun de votre côté : dès que vous aimez le même prénom, il apparaît ici.</p>
        </div>
      )}
      <ol className="mt-3 flex flex-col gap-2">
        {sorted.map((n, i) => {
          const m = meta(n)
          const c = byName.get(normName(n))
          return (
            <li key={n} className="rounded-3xl bg-surface shadow-soft p-3 flex items-center gap-2">
              <span className="w-7 text-center font-display text-lg text-ink-soft">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-2xl font-semibold leading-tight">{n}</p>
                {m?.note ? <p className="text-sm text-ink-soft truncate">{m.note}</p> : c && <p className="text-xs text-ink-soft">{popularityLabel(c)}</p>}
              </div>
              <button aria-label={m?.star ? `Retirer ${n} des favoris` : `Mettre ${n} en favori`} aria-pressed={!!m?.star} onClick={() => upsert(n, { star: !m?.star })} className="press size-11 grid place-items-center">
                <Star size={22} className={m?.star ? 'text-mustard' : 'text-ink-soft'} fill={m?.star ? 'currentColor' : 'none'} />
              </button>
              <button aria-label={`Note pour ${n}`} onClick={() => { setNoting(n); setNoteText(m?.note ?? '') }} className="press size-11 grid place-items-center text-ink-soft">
                <StickyNote size={20} />
              </button>
              <div className="flex flex-col">
                <button aria-label={`Monter ${n}`} disabled={i === 0} onClick={() => move(i, -1)} className="press size-8 grid place-items-center disabled:opacity-30">
                  <ArrowUp size={18} />
                </button>
                <button aria-label={`Descendre ${n}`} disabled={i === sorted.length - 1} onClick={() => move(i, 1)} className="press size-8 grid place-items-center disabled:opacity-30">
                  <ArrowDown size={18} />
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      <Sheet open={!!noting} onClose={() => setNoting(null)} title={`Note : ${noting ?? ''}`}>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (noting) await upsert(noting, { note: noteText.trim() || null })
            setNoting(null)
          }}
        >
          <TextArea label="Pourquoi on l’aime" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Ça sonne bien avec… ; le prénom de… ; deuxième prénom ?" />
          <Button type="submit" block>
            Enregistrer
          </Button>
        </form>
      </Sheet>
    </section>
  )
}

// ------------------------------------------------------------------ compat
function Compat({ matches }: { matches: string[] }) {
  const family = useSetting<string>('family_name', '')
  const { setSetting } = useStore()
  const [familyDraft, setFamilyDraft] = useState(family)
  const [first, setFirst] = useState('')
  useEffect(() => setFamilyDraft(family), [family])
  const result = first.trim() && family ? compatibility(first.trim(), family) : null
  const ranking = family ? matches.map((m) => ({ name: m, ...compatibility(m, family) })).sort((a, b) => b.score - a.score) : []

  return (
    <section className="mt-4 flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <Field
          label="Nom de famille de Biboun"
          value={familyDraft}
          onChange={(e) => setFamilyDraft(e.target.value)}
          onBlur={() => familyDraft.trim() !== family && setSetting('family_name', familyDraft.trim())}
          placeholder="Ex. Dupont, ou Dupont-Martin"
          hint="Partagé entre vous deux. Modifiable à tout moment."
        />
        <Field label="Prénom à tester" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Tape un prénom…" list="match-list" />
        <datalist id="match-list">
          {matches.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </Card>

      {!family && <p className="text-center text-ink-soft">Indique d’abord le nom de famille 👆</p>}

      {result && (
        <Card className="text-center animate-pop" key={first + family}>
          <p className="font-display text-3xl font-semibold">
            {first.trim()} {family.toUpperCase()}
          </p>
          <p className="text-6xl mt-3" aria-hidden>
            {result.emoji}
          </p>
          <p className="font-display text-5xl text-primary font-semibold">{result.score} %</p>
          <p className="font-bold mt-1">{result.verdict}</p>
          <ul className="mt-4 text-left flex flex-col gap-2">
            {result.notes.map((n) => (
              <li key={n} className="rounded-2xl bg-surface-2 px-3 py-2 text-sm">
                {n}
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-soft mt-3">Test 100 % pour rire, basé sur la sonorité. Le vrai test : le dire à voix haute 10 fois 😄</p>
        </Card>
      )}

      {ranking.length > 0 && (
        <Card>
          <h2 className="font-display text-xl font-semibold mb-2">Vos matchs au banc d’essai</h2>
          <ol className="flex flex-col gap-1">
            {ranking.map((r) => (
              <li key={r.name}>
                <button onClick={() => setFirst(r.name)} className="press w-full flex items-center gap-3 min-h-11 text-left">
                  <span className="text-xl" aria-hidden>
                    {r.emoji}
                  </span>
                  <span className="flex-1 font-semibold">{r.name}</span>
                  <span className="font-display text-lg text-primary">{r.score} %</span>
                </button>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </section>
  )
}
