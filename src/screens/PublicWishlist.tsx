import { useCallback, useEffect, useState } from 'react'
import { Gift } from 'lucide-react'
import { Biboun } from '@/components/Biboun'
import { supabase } from '@/lib/supabase'

interface Item {
  id: string
  label: string
  done: boolean
  reserved_by: string | null
}
interface Data {
  ok: boolean
  title?: string
  message?: string | null
  parents?: string
  items?: Item[]
}

const NAME_KEY = 'bibouns.giftName'
const ERRORS: Record<string, string> = {
  deja_pris: 'Oups, quelqu’un vient de le réserver !',
  trop_de_demandes: 'Trop de demandes, réessayez dans quelques minutes.',
  prenom: 'Indiquez votre prénom.',
  pas_le_votre: 'Seule la personne qui a réservé peut annuler.',
  lien_invalide: 'Ce lien n’est plus actif.',
}

/** Page publique (sans compte) : la famille consulte et réserve les cadeaux. */
export function PublicWishlist({ token }: { token: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [picking, setPicking] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return setData({ ok: false })
    const { data: d } = await supabase.rpc('public_wishlist', { p_token: token })
    setData((d as Data) ?? { ok: false })
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  async function reserve(item: Item, cancel = false) {
    if (!name.trim()) return setMsg(ERRORS.prenom)
    try {
      localStorage.setItem(NAME_KEY, name.trim())
    } catch {
      /* ignore */
    }
    const { data: r } = await supabase!.rpc('reserve_wishlist_item', { p_token: token, p_item: item.id, p_name: name.trim(), p_cancel: cancel })
    setMsg(r?.ok ? (cancel ? 'Réservation annulée.' : `Merci ${name.trim()} ! C’est noté 🎁`) : (ERRORS[r?.error] ?? 'Une erreur est survenue.'))
    setPicking(null)
    await load()
  }

  if (!data) return <div className="min-h-dvh grid place-items-center"><Biboun size={100} className="animate-float" title="Chargement" /></div>
  if (!data.ok)
    return (
      <main className="min-h-dvh grid place-items-center px-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Biboun size={110} mood="sleepy" />
          <h1 className="text-2xl font-semibold">Ce lien n’est plus actif</h1>
          <p className="text-ink-soft">Demandez un nouveau lien aux futurs parents.</p>
        </div>
      </main>
    )

  const items = data.items ?? []
  const available = items.filter((i) => !i.done && !i.reserved_by)
  return (
    <main className="min-h-dvh px-4 pt-safe pb-safe max-w-lg mx-auto py-6 flex flex-col gap-5">
      <header className="flex flex-col items-center text-center gap-2">
        <Biboun mood="love" size={110} className="animate-float" />
        <h1 className="text-3xl font-semibold">La liste de naissance{data.parents ? ` de ${data.parents}` : ''}</h1>
        {data.message && <p className="text-ink-soft">{data.message}</p>}
        <p className="text-sm font-semibold">
          {available.length} idée{available.length > 1 ? 's' : ''} encore disponible{available.length > 1 ? 's' : ''}
        </p>
      </header>
      <div className="rounded-3xl bg-surface shadow-soft p-4 flex flex-col gap-2">
        <label htmlFor="gift-name" className="font-bold">
          Votre prénom
        </label>
        <input id="gift-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mamie Josette, Tonton Paul…" maxLength={60} className="w-full min-h-13 rounded-2xl bg-surface-2 px-4 border-2 border-transparent focus:border-primary focus:outline-none" />
      </div>
      {msg && (
        <p role="status" className="rounded-2xl bg-primary-soft px-4 py-3 font-semibold text-center">
          {msg}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {items.map((i) => {
          const mine = !!i.reserved_by && i.reserved_by.toLowerCase() === name.trim().toLowerCase()
          return (
            <li key={i.id} className={`rounded-3xl bg-surface shadow-soft p-4 flex items-center gap-3 ${i.done || (i.reserved_by && !mine) ? 'opacity-60' : ''}`}>
              <span className="flex-1 font-semibold">{i.label}</span>
              {i.done ? (
                <span className="text-sm font-bold text-ink-soft">Déjà reçu ✓</span>
              ) : i.reserved_by ? (
                mine ? (
                  <button onClick={() => reserve(i, true)} className="press min-h-11 px-3 rounded-full bg-surface-2 text-sm font-bold">
                    Annuler ma réservation
                  </button>
                ) : (
                  <span className="text-sm font-bold text-ink-soft">🎁 {i.reserved_by}</span>
                )
              ) : picking === i.id ? (
                <button onClick={() => reserve(i)} className="press min-h-11 px-4 rounded-full bg-primary text-primary-ink text-sm font-bold">
                  Confirmer
                </button>
              ) : (
                <button onClick={() => setPicking(i.id)} className="press min-h-11 px-4 rounded-full bg-primary-soft text-sm font-bold inline-flex items-center gap-1">
                  <Gift size={16} /> Je l’offre
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-center text-xs text-ink-soft">Seuls les noms des articles sont visibles. Fait avec amour avec Biboun’s 🧡</p>
    </main>
  )
}
