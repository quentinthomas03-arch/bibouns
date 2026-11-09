import { useEffect, useState } from 'react'
import { Copy, KeyRound } from 'lucide-react'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'

const ACTIONS: [string, string][] = [
  ['biberon', '🍼 Biberon (même quantité que la dernière fois, ou ajoute « ml »)'],
  ['pipi', '💧 Pipi'],
  ['caca', '💩 Caca'],
  ['pipi_caca', '💧💩 Les deux'],
  ['tetee_g', '🤱 Tétée gauche (lance le chrono)'],
  ['tetee_d', '🤱 Tétée droite'],
  ['fin_tetee', '⏹️ Fin de tétée'],
  ['dodo', '😴 Dodo'],
  ['reveil', '☀️ Réveil'],
  ['soin', '💊 Soin (1er soin de la liste, ou ajoute « name »)'],
]

/**
 * Raccourcis iPhone : un jeton personnel permet à l'app Raccourcis (et Siri,
 * et le widget Raccourcis de l'écran d'accueil) d'ajouter une saisie bébé.
 */
export function ShortcutSettings() {
  const toast = useToast()
  const [has, setHas] = useState<boolean | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const url = `${import.meta.env.VITE_SUPABASE_URL ?? 'https://…supabase.co'}/rest/v1/rpc/quick_log`
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '…'

  useEffect(() => {
    void supabase?.rpc('has_shortcut_token').then(({ data }) => setHas(!!data))
  }, [])

  const copy = (v: string, what: string) => navigator.clipboard?.writeText(v).then(() => toast(`${what} copié`))

  async function create() {
    if (!supabase) return toast('Indisponible en mode démo')
    if (has && !confirm('Un nouveau jeton remplace l’ancien : tes raccourcis existants devront être mis à jour. Continuer ?')) return
    const { data, error } = await supabase.rpc('create_shortcut_token')
    if (error || !data?.ok) return toast('Impossible pour le moment (réseau ?)')
    setToken(data.token)
    setHas(true)
    setOpen(true)
  }

  async function revoke() {
    if (!confirm('Désactiver tes raccourcis ? Ils ne fonctionneront plus.')) return
    await supabase?.rpc('revoke_shortcut_token')
    setHas(false)
    setToken(null)
    toast('Raccourcis désactivés')
  }

  const Copyable = ({ label, value }: { label: string; value: string }) => (
    <button onClick={() => copy(value, label)} className="press w-full text-left rounded-2xl bg-surface-2 p-3 flex items-center gap-2">
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-bold text-ink-soft">{label}</span>
        <span className="block font-mono text-sm truncate">{value}</span>
      </span>
      <Copy size={18} aria-hidden />
    </button>
  )

  return (
    <>
      <SectionTitle>Raccourcis iPhone & Siri</SectionTitle>
      <Card className="flex flex-col gap-3">
        <p className="text-sm">
          Note un biberon ou une couche <strong>en 1 tap depuis l’écran d’accueil</strong> (widget Raccourcis), en touchant le dos du téléphone, ou en disant <em>« Dis Siri, biberon »</em>, sans ouvrir l’appli.
        </p>
        <p className="text-xs text-ink-soft">
          Un jeton personnel secret est utilisé : il permet seulement d’<strong>ajouter</strong> une saisie bébé (aucune lecture de vos données) et se désactive ici à tout moment. Ne le partage pas.
        </p>
        <div className="flex gap-2">
          <Button size="md" className="flex-1" icon={<KeyRound size={18} />} onClick={create}>
            {has ? 'Nouveau jeton' : 'Créer mon jeton'}
          </Button>
          {has && (
            <Button size="md" variant="outline" onClick={revoke}>
              Désactiver
            </Button>
          )}
        </div>
        {has && !token && <p className="text-xs text-ink-soft">Un jeton est actif. Il n’est affiché qu’à sa création : crée-en un nouveau si tu l’as perdu.</p>}
        {token && <p className="text-sm font-bold text-primary">Copie ton jeton maintenant : il ne sera plus affiché ensuite.</p>}
        <button onClick={() => setOpen(!open)} className="press text-left font-bold text-primary underline min-h-11">
          {open ? 'Masquer le pas-à-pas' : 'Voir le pas-à-pas (5 min, une seule fois)'}
        </button>
        {open && (
          <div className="flex flex-col gap-3 text-sm">
            <Copyable label="URL" value={url} />
            <Copyable label="Clé (en-tête apikey)" value={key} />
            {token && <Copyable label="Ton jeton (token)" value={token} />}
            <ol className="list-decimal pl-5 flex flex-col gap-2">
              <li>
                Ouvre l’app <strong>Raccourcis</strong> → <strong>+</strong> → <strong>Ajouter une action</strong> → cherche <strong>« Obtenir le contenu de l’URL »</strong>.
              </li>
              <li>Colle l’<strong>URL</strong> ci-dessus à la place de « URL ».</li>
              <li>
                Touche la flèche <strong>›</strong> de l’action : <strong>Méthode</strong> = <strong>POST</strong>.
              </li>
              <li>
                <strong>En-têtes</strong> → « Ajouter un nouvel en-tête » : clé <code>apikey</code>, texte = la <strong>Clé</strong> ci-dessus. Ajoute un 2e en-tête : <code>Content-Type</code> = <code>application/json</code>.
              </li>
              <li>
                <strong>Corps de la requête</strong> = <strong>JSON</strong>, puis ajoute les champs (type Texte) : <code>token</code> = ton jeton, <code>action</code> = <code>biberon</code>. Option : champ Nombre <code>ml</code> = 120.
              </li>
              <li>
                Ajoute l’action <strong>« Obtenir la valeur du dictionnaire »</strong> (clé <code>message</code>) puis <strong>« Afficher la notification »</strong> : tu verras « Biberon 120 ml noté 🍼 ».
              </li>
              <li>
                Renomme le raccourci (ex. <strong>Biberon</strong>) : il marche aussitôt avec <em>« Dis Siri, Biberon »</em>. Duplique-le pour chaque action (change juste <code>action</code>).
              </li>
              <li>
                Écran d’accueil : appui long → <strong>+</strong> → widget <strong>Raccourcis</strong> → choisis tes raccourcis. Bonus : Réglages → Accessibilité → Toucher → <strong>Toucher le dos</strong> → Toucher deux fois → Biberon.
              </li>
            </ol>
            <div className="rounded-2xl bg-surface-2 p-3">
              <p className="font-bold mb-1">Valeurs possibles pour « action »</p>
              <ul className="flex flex-col gap-1">
                {ACTIONS.map(([v, l]) => (
                  <li key={v}>
                    <code className="font-bold">{v}</code> — {l}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card>
    </>
  )
}
