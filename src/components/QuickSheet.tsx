import { useState } from 'react'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { usePhase } from '@/app/phase'
import { useStore } from '@/sync/store'
import { useToast } from './ui/Toast'
import { notes, quickActions } from '@/content/fr'

/**
 * Ajout rapide (bouton central). S'adapte à la phase :
 * en Phase 2, les gros boutons repas / couche / sommeil arriveront ici.
 */
export function QuickSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { phase } = usePhase()
  const { save } = useStore()
  const toast = useToast()
  const [text, setText] = useState('')

  const upcoming =
    phase === 'after'
      ? ['🍼 Repas', '💩 Couche', '😴 Sommeil', '💊 Vitamine']
      : phase === 'dday'
        ? ['⏱️ Contraction', '📞 Contacts', '🧳 Valise']
        : ['📅 Rendez-vous', '📝 Journal', '⚖️ Mesure', '✅ Tâche']

  async function sendNote(body: string) {
    if (!body.trim()) return
    await save('notes', { body: body.trim() })
    setText('')
    toast('Envoyé 💌')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={quickActions.title}>
      <div className="grid grid-cols-2 gap-3">
        {upcoming.map((u) => (
          <button key={u} disabled className="rounded-3xl bg-surface p-4 min-h-24 text-left font-bold text-lg opacity-60 shadow-soft">
            {u}
            <span className="block text-xs font-semibold text-ink-soft">bientôt</span>
          </button>
        ))}
      </div>
      <form
        className="mt-5 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void sendNote(text)
        }}
      >
        <label htmlFor="quick-note" className="font-bold px-1">
          💌 {quickActions.note}
        </label>
        <input
          id="quick-note"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={notes.placeholder}
          className="min-h-13 rounded-2xl bg-surface-2 px-4 border-2 border-transparent focus:border-primary focus:outline-none"
        />
        <Button type="submit" block>
          {notes.send}
        </Button>
      </form>
    </Sheet>
  )
}
