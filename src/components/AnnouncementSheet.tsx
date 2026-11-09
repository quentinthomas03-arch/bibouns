import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Share2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { usePhase } from '@/app/phase'
import { useMembers } from '@/app/members'
import { drawAnnouncement, shareFile } from '@/lib/card'

/** Faire-part : choisir une photo (elle reste sur le téléphone), aperçu, envoi. */
export function AnnouncementSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { baby } = usePhase()
  const { members } = useMembers()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const parents = [...members].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '')).map((m) => m.first_name).join(' & ')

  useEffect(() => {
    if (!open || !baby?.born_at) return
    let alive = true
    void drawAnnouncement({
      name: (baby.first_name as string) || 'Biboun',
      sex: ((baby.sex as 'f' | 'm' | 'x') || 'x') as 'f' | 'm' | 'x',
      bornAt: baby.born_at as string,
      weightG: baby.weight_g as number | null,
      lengthMm: baby.length_mm as number | null,
      parents,
      photo,
    }).then((b) => {
      if (!alive) return
      setBlob(b)
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old)
        return URL.createObjectURL(b)
      })
    })
    return () => {
      alive = false
    }
  }, [open, photo, baby?.born_at, baby?.first_name, baby?.sex, baby?.weight_g, baby?.length_mm, parents]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onClose={onClose} title="Faire-part de naissance">
      {!baby?.born_at ? (
        <p>Le faire-part sera disponible dès que la naissance sera enregistrée 🧡</p>
      ) : (
        <div className="flex flex-col gap-4">
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          {preview ? <img src={preview} alt="Aperçu du faire-part" className="w-full rounded-3xl shadow-soft" /> : <div className="aspect-[4/5] rounded-3xl bg-surface-2 animate-pulse" />}
          <Button variant="soft" block icon={<ImagePlus size={20} />} onClick={() => fileRef.current?.click()}>
            {photo ? 'Changer la photo' : 'Ajouter une photo'}
          </Button>
          <Button block icon={<Share2 size={20} />} disabled={!blob} onClick={async () => blob && (await shareFile(blob, `faire-part-${((baby.first_name as string) || 'biboun').toLowerCase()}.jpg`)) === 'downloaded' && toast('Faire-part téléchargé')}>
            Envoyer / enregistrer
          </Button>
          <p className="text-xs text-ink-soft">La photo choisie sert seulement à dessiner l’image sur ton téléphone : elle n’est pas envoyée sur le serveur.</p>
        </div>
      )}
    </Sheet>
  )
}
