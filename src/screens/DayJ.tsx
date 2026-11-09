import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Car, Check, MessageCircle, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/Toast'
import { Biboun } from '@/components/Biboun'
import { toLocalInput } from '@/components/pregnancy/Sheets'
import { usePhase } from '@/app/phase'
import { useMembers } from '@/app/members'
import { useNow } from '@/app/useNow'
import { useRows, useSetting, useStore, stableId, nowIso, newId } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'
import { contractionStats, formatSec, type Contraction } from '@/lib/contractions'
import { listStats, type ChecklistRow, type ItemRow } from '@/lib/checklists'
import { ALERTS, ALERT_TITLE, DEFAULT_CONTACT_ROLES, DOCUMENTS, EMERGENCY_NUMBERS, LAUNCH_CONFIRM, RULE_STATE, RULE_TEXT, RULE_TITLE, messages } from '@/content/dday'

type ContractionRow = BaseRow & Contraction
interface Contact {
  id: string
  name: string
  role: string
  phone: string
}
interface Maternity {
  name: string
  address: string
  phone: string
}

async function share(text: string) {
  if (navigator.share) {
    try {
      await navigator.share({ text })
      return
    } catch {
      return
    }
  }
  location.href = `sms:&body=${encodeURIComponent(text)}`
}

/** Écran Jour J : tout ce qu'il faut, gros boutons, zéro réflexion. */
export function DayJ() {
  const laborStarted = useSetting<boolean>('labor_started', false)
  const { setSetting } = useStore()
  const { me } = useMembers()
  const { baby } = usePhase()
  const [birthOpen, setBirthOpen] = useState(false)
  const born = !!baby?.born_at

  return (
    <div className="px-4 pt-safe pb-tabbar max-w-lg mx-auto">
      <header className="flex items-center gap-2 pt-2">
        <Link to="/" aria-label="Retour" className="press size-11 grid place-items-center rounded-full bg-surface shadow-soft">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-3xl font-semibold flex-1">Jour J 🚀</h1>
      </header>

      {!laborStarted && !born && (
        <Card className="mt-4 text-center flex flex-col items-center gap-3 bg-primary-soft">
          <Biboun mood="wow" size={100} className="animate-float" />
          <p className="font-display text-2xl">Prêts pour le grand jour ?</p>
          <Button
            size="xl"
            block
            onClick={async () => {
              if (!confirm(LAUNCH_CONFIRM)) return
              await setSetting('labor_started', true)
              await setSetting('labor_started_at', nowIso())
              await setSetting('phase_manual', null)
            }}
          >
            Ça y est ! 🚀
          </Button>
          <p className="text-sm text-ink-soft">Lance le chrono des contractions et prépare le message pour la famille.</p>
        </Card>
      )}

      {(laborStarted || born) && <ContractionTimer />}

      <Alerts />
      <Calls />
      <Route />
      <Bags />
      <Documents />

      <SectionTitle>Messages</SectionTitle>
      <div className="flex flex-col gap-2">
        <Button variant="soft" block icon={<MessageCircle size={20} />} onClick={() => share(messages.started(me?.first_name ?? ''))}>
          Prévenir : « c’est parti ! »
        </Button>
        {!born && (
          <Button block size="xl" onClick={() => setBirthOpen(true)}>
            👶 Bébé est né !
          </Button>
        )}
      </div>
      <BirthSheet open={birthOpen} onClose={() => setBirthOpen(false)} />
    </div>
  )
}

// ------------------------------------------------------------------ contractions
export function ContractionTimer({ compact = false }: { compact?: boolean }) {
  const rows = useRows<ContractionRow>('contractions') ?? []
  const { save, patch, remove } = useStore()
  const now = useNow(1000)
  const list = useMemo(() => [...rows].sort((a, b) => a.started_at.localeCompare(b.started_at)), [rows])
  const current = list.find((c) => !c.ended_at)
  const stats = contractionStats(list, now)
  const st = RULE_STATE[stats.state]
  const elapsed = current ? Math.floor((now.getTime() - Date.parse(current.started_at)) / 1000) : 0
  const recent = [...list].reverse().slice(0, compact ? 3 : 8)

  return (
    <section className="mt-4">
      <Card className="flex flex-col gap-4">
        <button
          onClick={() => (current ? patch('contractions', current.id, { ended_at: nowIso() }) : save('contractions', { started_at: nowIso(), ended_at: null }))}
          className={`press w-full rounded-[2rem] min-h-32 font-display text-3xl font-semibold shadow-soft ${current ? 'bg-ink text-bg' : 'bg-primary text-primary-ink'}`}
          aria-live="polite"
        >
          {current ? (
            <>
              ⏹️ Fin <span className="block text-xl tabular-nums">{formatSec(elapsed)}</span>
            </>
          ) : (
            '⏱️ Début de contraction'
          )}
        </button>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat value={stats.avgIntervalMin !== null ? `${stats.avgIntervalMin.toLocaleString('fr-FR')} min` : '—'} label="intervalle moyen" />
          <Stat value={stats.avgDurationSec !== null ? formatSec(stats.avgDurationSec) : '—'} label="durée moyenne" />
          <Stat value={String(stats.lastHourCount)} label="sur 1 heure" />
        </div>
        <div className={`rounded-3xl p-4 ${stats.state === 'reached' ? 'bg-primary text-primary-ink' : stats.state === 'close' ? 'bg-mustard/30' : 'bg-surface-2'}`} role="status">
          <p className="font-bold text-lg">
            {st.emoji} {st.text}
          </p>
          {stats.sustainedMin > 0 && <p className="text-sm mt-1">Rythme ≤ 6 min depuis {stats.sustainedMin} min{stats.regular ? ', régulier' : ', encore irrégulier'}.</p>}
        </div>
        {!compact && (
          <details className="text-sm">
            <summary className="font-bold min-h-8 cursor-pointer">{RULE_TITLE}</summary>
            <p className="mt-1 text-ink-soft">{RULE_TEXT}</p>
          </details>
        )}
        {recent.length > 0 && (
          <ol className="flex flex-col gap-1 text-sm">
            {recent.map((c) => {
              const idx = list.indexOf(c)
              const prev = list[idx - 1]
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 min-h-11">
                  <span className="font-bold tabular-nums w-12">{new Date(c.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="flex-1">{c.ended_at ? `dure ${formatSec((Date.parse(c.ended_at) - Date.parse(c.started_at)) / 1000)}` : 'en cours…'}</span>
                  {prev && <span className="text-ink-soft">+{Math.round((Date.parse(c.started_at) - Date.parse(prev.started_at)) / 6000) / 10} min</span>}
                  {!compact && (
                    <button aria-label="Supprimer cette contraction" onClick={() => remove('contractions', c.id)} className="press size-9 grid place-items-center text-ink-soft">
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </Card>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 py-2 px-1">
      <p className="font-display text-lg font-semibold leading-tight">{value}</p>
      <p className="text-[0.7rem] text-ink-soft font-semibold leading-tight">{label}</p>
    </div>
  )
}

function Alerts() {
  return (
    <div role="note" className="mt-4 rounded-3xl bg-danger/10 border-2 border-danger/30 p-4">
      <p className="font-bold text-danger">⚠️ {ALERT_TITLE}</p>
      <ul className="list-disc pl-5 mt-1 text-sm">
        {ALERTS.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </div>
  )
}

// ------------------------------------------------------------------ appels
function Calls() {
  const maternity = useSetting<Maternity | null>('maternity', null)
  const contacts = useSetting<Contact[]>('contacts', [])
  const [editing, setEditing] = useState(false)
  const callBtn = (label: string, sub: string, phone: string, primary = false) => (
    <a key={label + phone} href={`tel:${phone.replace(/\s/g, '')}`} className={`press flex items-center gap-3 rounded-3xl p-4 min-h-16 shadow-soft ${primary ? 'bg-primary text-primary-ink' : 'bg-surface'}`}>
      <Phone size={22} aria-hidden />
      <span className="flex-1">
        <span className="block font-bold text-lg leading-tight">{label}</span>
        <span className={`block text-sm ${primary ? 'opacity-90' : 'text-ink-soft'}`}>{sub}</span>
      </span>
    </a>
  )
  return (
    <>
      <div className="flex items-center justify-between mt-6 mb-2">
        <h2 className="font-display text-lg font-semibold text-ink-soft px-1">Appeler</h2>
        <button onClick={() => setEditing(true)} className="press inline-flex items-center gap-1 text-sm font-bold text-primary min-h-11 px-2">
          <Pencil size={16} /> Modifier
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {maternity?.phone ? callBtn(maternity.name || 'Maternité', maternity.phone, maternity.phone, true) : (
          <button onClick={() => setEditing(true)} className="press rounded-3xl border-2 border-dashed border-line p-4 font-bold text-ink-soft">
            + Ajouter la maternité et les contacts clés
          </button>
        )}
        {contacts.map((c) => callBtn(c.name, `${c.role} · ${c.phone}`, c.phone))}
        <div className="grid grid-cols-2 gap-2">{EMERGENCY_NUMBERS.map((n) => callBtn(n.phone, n.label, n.phone))}</div>
      </div>
      <ContactsSheet open={editing} onClose={() => setEditing(false)} />
    </>
  )
}

function ContactsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const maternity = useSetting<Maternity | null>('maternity', null)
  const contacts = useSetting<Contact[]>('contacts', [])
  const { setSetting } = useStore()
  const toast = useToast()
  const [m, setM] = useState<Maternity>({ name: '', address: '', phone: '' })
  const [list, setList] = useState<Contact[]>([])
  useEffect(() => {
    if (!open) return
    setM(maternity ?? { name: '', address: '', phone: '' })
    setList(contacts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  async function submit(e: FormEvent) {
    e.preventDefault()
    await setSetting('maternity', m)
    await setSetting('contacts', list.filter((c) => c.name.trim() && c.phone.trim()))
    toast('Contacts enregistrés 📞')
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Maternité & contacts">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Maternité" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} placeholder="Maternité de…" />
        <Field label="Téléphone de la maternité (salle de naissance)" type="tel" value={m.phone} onChange={(e) => setM({ ...m, phone: e.target.value })} />
        <Field label="Adresse" value={m.address} onChange={(e) => setM({ ...m, address: e.target.value })} placeholder="Pour le trajet dans Plans" />
        <p className="font-bold px-1">Contacts clés</p>
        {list.map((c, i) => (
          <div key={c.id} className="rounded-3xl bg-surface-2 p-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <Field label="Nom" className="flex-1" value={c.name} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <button type="button" aria-label="Retirer ce contact" onClick={() => setList(list.filter((_, j) => j !== i))} className="press self-end size-13 grid place-items-center text-ink-soft">
                <Trash2 size={18} />
              </button>
            </div>
            <Field label="Téléphone" type="tel" value={c.phone} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} />
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_CONTACT_ROLES.map((r) => (
                <button type="button" key={r} aria-pressed={c.role === r} onClick={() => setList(list.map((x, j) => (j === i ? { ...x, role: r } : x)))} className={`press min-h-10 px-3 rounded-full text-sm font-semibold ${c.role === r ? 'bg-ink text-bg' : 'bg-surface'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" icon={<Plus size={18} />} onClick={() => setList([...list, { id: newId(), name: '', role: 'Famille', phone: '' }])}>
          Ajouter un contact
        </Button>
        <Button type="submit" block>
          Enregistrer
        </Button>
      </form>
    </Sheet>
  )
}

// ------------------------------------------------------------------ trajet, valise, documents
function Route() {
  const maternity = useSetting<Maternity | null>('maternity', null)
  if (!maternity?.address) return null
  return (
    <a href={`https://maps.apple.com/?daddr=${encodeURIComponent(maternity.address)}&dirflg=d`} target="_blank" rel="noreferrer" className="press mt-3 flex items-center gap-3 rounded-3xl bg-surface p-4 min-h-16 shadow-soft">
      <Car size={22} aria-hidden />
      <span className="flex-1">
        <span className="block font-bold text-lg leading-tight">Trajet vers la maternité</span>
        <span className="block text-sm text-ink-soft">{maternity.address}</span>
      </span>
    </a>
  )
}

function Bags() {
  const lists = (useRows<BaseRow & ChecklistRow>('checklists') ?? []).filter((l) => l.kind.startsWith('valise'))
  const items = useRows<BaseRow & ItemRow>('checklist_items') ?? []
  if (lists.length === 0) return null
  return (
    <>
      <SectionTitle>Valises</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {lists.map((l) => {
          const s = listStats(items.filter((i) => i.checklist_id === l.id))
          return (
            <Link key={l.id} to={`/listes/${l.id}`} className="press rounded-3xl bg-surface shadow-soft p-3 text-center">
              <span className="text-3xl" aria-hidden>
                {l.emoji}
              </span>
              <p className="text-xs font-bold leading-tight mt-1">{l.title.replace('Valise maternité — ', '')}</p>
              <p className={`font-display text-lg ${s.done === s.total ? 'text-sage' : ''}`}>
                {s.done}/{s.total}
              </p>
            </Link>
          )
        })}
      </div>
    </>
  )
}

function Documents() {
  const checked = useSetting<string[]>('dday_docs', [])
  const { setSetting } = useStore()
  return (
    <>
      <SectionTitle>Documents à emporter</SectionTitle>
      <Card className="!p-2">
        {DOCUMENTS.map((d) => {
          const on = checked.includes(d)
          return (
            <button key={d} onClick={() => setSetting('dday_docs', on ? checked.filter((x) => x !== d) : [...checked, d])} aria-pressed={on} className="press w-full flex items-center gap-3 min-h-12 px-2 text-left">
              <span className={`size-7 shrink-0 rounded-full grid place-items-center ${on ? 'bg-sage text-white' : 'border-[3px] border-line'}`}>{on && <Check size={16} strokeWidth={3.5} />}</span>
              <span className={on ? 'line-through text-ink-soft' : 'font-semibold'}>{d}</span>
            </button>
          )
        })}
      </Card>
    </>
  )
}

// ------------------------------------------------------------------ naissance
export function BirthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { baby } = usePhase()
  const { me, partner } = useMembers()
  const { save, setSetting, householdId } = useStore()
  const navigate = useNavigate()
  const [when, setWhen] = useState('')
  const [name, setName] = useState('')
  const [sex, setSex] = useState<'f' | 'm' | 'x'>('x')
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [head, setHead] = useState('')
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setWhen(toLocalInput(new Date().toISOString()))
    setName((baby?.first_name as string) ?? '')
    setSex(((baby?.sex as 'f' | 'm' | 'x') || 'x') as 'f' | 'm' | 'x')
    setDone(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const num = (s: string) => {
    const v = parseFloat(s.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(v) ? v : null
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const bornAt = new Date(when).toISOString()
    const w = num(weight)
    // accepte "3,45" (kg) ou "3450" (g)
    const weight_g = w === null ? null : w < 20 ? Math.round(w * 1000) : Math.round(w)
    const l = num(length)
    const h = num(head)
    await save('babies', {
      id: (baby?.id as string) ?? stableId(householdId, 'baby'),
      first_name: name.trim() || null,
      sex,
      born_at: bornAt,
      weight_g,
      length_mm: l !== null ? Math.round(l * 10) : null,
      head_mm: h !== null ? Math.round(h * 10) : null,
      deleted_at: null,
    })
    if (weight_g || l || h) {
      await save('growth', { id: stableId(householdId, 'growth', 'birth'), deleted_at: null, measured_on: bornAt.slice(0, 10), weight_g, length_mm: l !== null ? Math.round(l * 10) : null, head_mm: h !== null ? Math.round(h * 10) : null })
    }
    await setSetting('labor_started', false)
    await setSetting('phase_manual', null)
    const d = new Date(bornAt)
    setDone(
      messages.born({
        name: name.trim() || 'Notre bébé',
        sex,
        date: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        weight: weight_g ? `${(weight_g / 1000).toLocaleString('fr-FR')} kg` : undefined,
        length: l ? `${l.toLocaleString('fr-FR')} cm` : undefined,
        parents: [me?.first_name, partner?.first_name].filter(Boolean).join(' & '),
      }),
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title={done ? 'Bienvenue ! 🎉' : 'Bébé est né !'}>
      {done ? (
        <div className="flex flex-col items-center text-center gap-4">
          <p className="text-5xl" aria-hidden>
            🎉👶🧡
          </p>
          <Biboun mood="love" size={120} className="animate-float" />
          <p className="rounded-3xl bg-surface-2 p-4 text-left">{done}</p>
          <Button block size="xl" icon={<MessageCircle size={22} />} onClick={() => share(done)}>
            Envoyer à la famille
          </Button>
          <Button
            variant="soft"
            block
            onClick={() => {
              onClose()
              navigate('/')
            }}
          >
            Aller à l’accueil
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Date et heure de naissance" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
          <Field label="Prénom" value={name} onChange={(e) => setName(e.target.value)} />
          <Segmented<'f' | 'm' | 'x'>
            label="Sexe"
            value={sex}
            onChange={setSex}
            options={[
              { value: 'f', label: 'Fille' },
              { value: 'm', label: 'Garçon' },
              { value: 'x', label: 'Plus tard' },
            ]}
          />
          <div className="grid grid-cols-3 gap-2">
            <Field label="Poids (kg)" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="3,3" />
            <Field label="Taille (cm)" inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} placeholder="50" />
            <Field label="PC (cm)" inputMode="decimal" value={head} onChange={(e) => setHead(e.target.value)} placeholder="34" />
          </div>
          <p className="text-sm text-ink-soft">L’appli passe en mode « Après » sur vos deux téléphones. Tout reste modifiable dans les réglages.</p>
          <Button type="submit" block size="xl">
            Enregistrer la naissance 🎉
          </Button>
        </form>
      )}
    </Sheet>
  )
}
