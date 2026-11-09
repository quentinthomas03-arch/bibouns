import { useEffect, useState } from 'react'
import { CalendarPlus, Copy } from 'lucide-react'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'

/** Abonnement : les RDV, échéances et vaccins apparaissent dans l'app Calendrier de l'iPhone. */
export function CalendarSettings() {
  const toast = useToast()
  const [has, setHas] = useState<boolean | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const base = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/calendar`

  useEffect(() => {
    void supabase?.rpc('has_calendar_token').then(({ data }) => setHas(!!data))
  }, [])

  async function create() {
    if (!supabase) return toast('Indisponible en mode démo')
    if (has && !confirm('Un nouveau lien remplace l’ancien : l’ancien abonnement s’arrêtera. Continuer ?')) return
    const { data, error } = await supabase.rpc('create_calendar_token')
    if (error || !data?.ok) return toast('Impossible pour le moment (réseau ?)')
    setUrl(`${base}?t=${data.token}`)
    setHas(true)
  }

  return (
    <>
      <SectionTitle>Calendrier iPhone</SectionTitle>
      <Card className="flex flex-col gap-3">
        <p className="text-sm">
          Vos <strong>rendez-vous</strong>, <strong>échéances des listes</strong> et <strong>vaccins conseillés</strong> apparaissent automatiquement dans l’app <strong>Calendrier</strong>, avec leurs rappels (et sur la montre).
        </p>
        <p className="text-xs text-ink-soft">Lien personnel en lecture seule : ne le partage pas. Chacun crée le sien sur son téléphone.</p>
        {!url ? (
          <Button block icon={<CalendarPlus size={20} />} onClick={create}>
            {has ? 'Créer un nouveau lien' : 'Ajouter à mon Calendrier'}
          </Button>
        ) : (
          <>
            <a href={url.replace(/^https:/, 'webcal:')} className="press min-h-14 rounded-3xl bg-primary text-primary-ink font-bold text-lg grid place-items-center shadow-soft">
              📅 S’abonner dans Calendrier
            </a>
            <button onClick={() => navigator.clipboard?.writeText(url).then(() => toast('Lien copié'))} className="press w-full text-left rounded-2xl bg-surface-2 p-3 flex items-center gap-2">
              <span className="flex-1 min-w-0 font-mono text-xs truncate">{url}</span>
              <Copy size={18} aria-hidden />
            </button>
            <details className="text-sm">
              <summary className="font-bold min-h-8 cursor-pointer">Si le bouton n’ouvre rien</summary>
              <ol className="list-decimal pl-5 mt-1 flex flex-col gap-1">
                <li>Copie le lien ci-dessus.</li>
                <li>Réglages de l’iPhone → <strong>Calendrier</strong> → <strong>Comptes</strong> → <strong>Ajouter un compte</strong> → <strong>Autre</strong>.</li>
                <li><strong>Ajouter un calendrier avec abonnement</strong> → colle le lien → Suivant → Enregistrer.</li>
              </ol>
            </details>
            <p className="text-xs text-ink-soft">L’iPhone met à jour l’abonnement régulièrement (réglable dans Réglages → Calendrier → Comptes → Récupérer). Un nouveau RDV peut mettre jusqu’à une heure à apparaître.</p>
          </>
        )}
      </Card>
    </>
  )
}
