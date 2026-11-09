import { useEffect, useState } from 'react'
import { Copy, Gift, Share2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'

const publicUrl = (token: string) => `${location.origin}${location.pathname}#/cadeaux?t=${token}`

/** Partager une liste en lecture seule avec la famille (réservation des cadeaux). */
export function WishlistShare({ checklistId, open, onClose }: { checklistId: string; open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [shared, setShared] = useState<boolean | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [message, setMessage] = useState('Merci de penser à Biboun ! Réservez un cadeau pour éviter les doublons 🧡')

  useEffect(() => {
    if (!open || !supabase) return
    void supabase.rpc('wishlist_shared', { p_checklist: checklistId }).then(({ data }) => setShared(!!data))
  }, [open, checklistId])

  async function create() {
    if (!supabase) return toast('Indisponible en mode démo')
    const { data, error } = await supabase.rpc('create_wishlist_share', { p_checklist: checklistId, p_message: message })
    if (error || !data?.ok) return toast('Impossible pour le moment (réseau ?)')
    setUrl(publicUrl(data.token))
    setShared(true)
  }

  async function revoke() {
    await supabase?.rpc('revoke_wishlist_share', { p_checklist: checklistId })
    setShared(false)
    setUrl(null)
    toast('Lien désactivé')
  }

  return (
    <Sheet open={open} onClose={onClose} title="Liste de naissance">
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          Partagez cette liste avec la famille : ils voient <strong>seulement les noms des articles</strong> (ni prix, ni notes, ni qui s’en occupe) et peuvent <strong>réserver un cadeau</strong> avec leur prénom. Vous voyez « 🎁 réservé par… » dans la liste.
        </p>
        {!url ? (
          <>
            <Field label="Petit message pour la famille" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />
            <Button block icon={<Gift size={20} />} onClick={create}>
              {shared ? 'Créer un nouveau lien' : 'Créer le lien à partager'}
            </Button>
            {shared && <p className="text-xs text-ink-soft">Un lien est déjà actif. En créer un nouveau désactive l’ancien.</p>}
          </>
        ) : (
          <>
            <Button block icon={<Share2 size={20} />} onClick={() => (navigator.share ? navigator.share({ title: 'Liste de naissance', text: message, url }).catch(() => undefined) : navigator.clipboard?.writeText(url).then(() => toast('Lien copié')))}>
              Envoyer le lien
            </Button>
            <button onClick={() => navigator.clipboard?.writeText(url).then(() => toast('Lien copié'))} className="press w-full text-left rounded-2xl bg-surface-2 p-3 flex items-center gap-2">
              <span className="flex-1 min-w-0 font-mono text-xs truncate">{url}</span>
              <Copy size={18} aria-hidden />
            </button>
          </>
        )}
        {shared && (
          <Button variant="danger" block onClick={revoke}>
            Désactiver le lien
          </Button>
        )}
      </div>
    </Sheet>
  )
}
