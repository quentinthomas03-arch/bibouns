import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { Biboun } from '@/components/Biboun'
import { PrivatePhoto } from '@/components/PrivatePhoto'
import { usePhase } from '@/app/phase'
import { useMembers } from '@/app/members'
import { useRows } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'
import { groupByMonth, lifeMonth, monthCardTitle } from '@/lib/memories'
import { FIRSTS } from '@/content/memories'

interface Memory extends BaseRow {
  memory_date: string
  title?: string | null
  body?: string | null
  first_kind?: string | null
  photo_paths: string[]
}
interface GrowthRow extends BaseRow {
  measured_on: string
  weight_g?: number | null
  length_mm?: number | null
  head_mm?: number | null
}

const fmtLong = (d: string) => new Date(d.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** Livre de naissance mois par mois, mis en page pour l'impression / le PDF. */
export function Book() {
  const { baby } = usePhase()
  const { me, partner } = useMembers()
  const memories = (useRows<Memory>('memories') ?? []).sort((a, b) => a.memory_date.localeCompare(b.memory_date))
  const growth = (useRows<GrowthRow>('growth') ?? []).sort((a, b) => a.measured_on.localeCompare(b.measured_on))
  const [preparing, setPreparing] = useState(false)
  const name = (baby?.first_name as string) || 'Biboun'
  const bornAt = baby?.born_at as string | undefined
  const birth = bornAt?.slice(0, 10) ?? null
  const groups = groupByMonth(memories, birth).reverse()
  const parents = [me?.first_name, partner?.first_name].filter(Boolean).join(' & ')

  async function print() {
    setPreparing(true)
    // attend le chargement des photos avant d'ouvrir l'impression
    const imgs = Array.from(document.images)
    await Promise.race([Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r))))), new Promise((r) => setTimeout(r, 8000))])
    setPreparing(false)
    window.print()
  }

  const growthAtEnd = (lm: number | null) => {
    if (lm === null || lm < 0 || !birth) return null
    return growth.filter((g) => lifeMonth(birth, g.measured_on) <= lm).at(-1) ?? null
  }

  return (
    <div className="book max-w-2xl mx-auto px-4 pt-safe pb-tabbar print:p-0 print:max-w-none">
      <div className="print:hidden flex items-center gap-2 pt-2 sticky top-0 bg-bg z-10 py-2">
        <Link to="/sauvegarde" aria-label="Retour" className="press size-11 grid place-items-center rounded-full bg-surface shadow-soft">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-2xl font-semibold flex-1">Livre</h1>
        <button onClick={print} disabled={preparing} className="press min-h-11 px-4 rounded-full bg-primary text-primary-ink font-bold inline-flex items-center gap-2 disabled:opacity-60">
          <Printer size={18} /> {preparing ? 'Photos…' : 'Imprimer / PDF'}
        </button>
      </div>
      <p className="print:hidden text-xs text-ink-soft mb-4">
        Dans la fenêtre d’impression de l’iPhone : bouton <strong>Partager</strong> → <strong>Enregistrer dans Fichiers</strong> pour obtenir un PDF. Les photos nécessitent le réseau.
      </p>

      <section className="book-page flex flex-col items-center justify-center text-center gap-4 min-h-[70vh] print:min-h-[250mm]">
        <Biboun mood="love" size={160} />
        <h2 className="font-display text-5xl font-semibold text-primary">Le livre de {name}</h2>
        {bornAt && (
          <p className="text-lg">
            {baby?.sex === 'f' ? 'Née' : baby?.sex === 'm' ? 'Né' : 'Né·e'} le {fmtLong(bornAt)} à {new Date(bornAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {baby?.weight_g ? ` · ${(Number(baby.weight_g) / 1000).toLocaleString('fr-FR')} kg` : ''}
            {baby?.length_mm ? ` · ${Number(baby.length_mm) / 10} cm` : ''}
          </p>
        )}
        {parents && <p className="text-ink-soft">Avec tout l’amour de {parents}</p>}
      </section>

      {groups.length === 0 && <p className="text-center text-ink-soft py-10 print:hidden">Ajoutez des souvenirs pour remplir le livre 📖</p>}

      {groups.map((g) => {
        const gr = growthAtEnd(g.lifeMonth)
        const firsts = g.items.map((m) => FIRSTS.find((f) => f.key === m.first_kind)).filter(Boolean)
        return (
          <section key={g.key} className="book-page mt-10 print:mt-0">
            <h2 className="font-display text-4xl font-semibold text-primary">{g.lifeMonth !== null && g.lifeMonth >= 0 ? monthCardTitle(g.lifeMonth) : g.label}</h2>
            <p className="text-ink-soft first-letter:uppercase">{g.label}</p>
            {(gr || firsts.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {gr?.weight_g && <span className="rounded-full bg-surface-2 px-3 py-1 font-semibold">⚖️ {(gr.weight_g / 1000).toLocaleString('fr-FR')} kg</span>}
                {gr?.length_mm && <span className="rounded-full bg-surface-2 px-3 py-1 font-semibold">📏 {gr.length_mm / 10} cm</span>}
                {firsts.map((f) => (
                  <span key={f!.key} className="rounded-full bg-surface-2 px-3 py-1 font-semibold">
                    {f!.emoji} {f!.label}
                  </span>
                ))}
              </div>
            )}
            {g.items
              .slice()
              .reverse()
              .map((m) => (
                <article key={m.id} className="mt-5 break-inside-avoid">
                  <p className="text-sm font-bold text-ink-soft first-letter:uppercase">{fmtLong(m.memory_date)}</p>
                  {m.title && <h3 className="font-display text-2xl font-semibold">{m.title}</h3>}
                  {m.body && <p className="mt-1 whitespace-pre-line">{m.body}</p>}
                  {m.photo_paths.length > 0 && (
                    <div className={`mt-2 grid gap-2 ${m.photo_paths.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {m.photo_paths.map((p) => (
                        <div key={p} className={`rounded-2xl overflow-hidden bg-surface-2 grid place-items-center ${m.photo_paths.length === 1 ? 'aspect-[4/3]' : 'aspect-square'}`}>
                          <PrivatePhoto path={p} alt={m.title ?? ''} />
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
          </section>
        )
      })}
    </div>
  )
}
