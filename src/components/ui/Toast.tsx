import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export interface ToastAction {
  label: string
  run: () => void | Promise<unknown>
}
type Show = (msg: string, action?: ToastAction) => void

const Ctx = createContext<Show>(() => {})

/**
 * Petits messages éphémères ("Enregistré ✓"). Avec une action (ex. « Annuler »),
 * le message s'affiche en bas, près du pouce, pendant 5 secondes.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; key: number; action?: ToastAction } | null>(null)
  const show = useCallback<Show>((text, action) => {
    const key = Date.now() + Math.random()
    setMsg({ text, key, action })
    setTimeout(() => setMsg((m) => (m?.key === key ? null : m)), action ? 5000 : 2200)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && !msg.action && (
        <div aria-live="polite" className="fixed inset-x-0 top-0 z-[80] flex justify-center pt-safe pointer-events-none">
          <div key={msg.key} className="mt-2 animate-pop rounded-full bg-ink text-bg px-5 py-3 font-bold shadow-soft">
            {msg.text}
          </div>
        </div>
      )}
      {msg?.action && (
        <div aria-live="polite" className="fixed inset-x-0 z-[80] flex justify-center px-4 pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 6.5rem)' }}>
          <div key={msg.key} className="pointer-events-auto animate-pop flex items-center gap-3 rounded-full bg-ink text-bg pl-5 pr-2 py-2 font-bold shadow-soft max-w-full">
            <span className="truncate">{msg.text}</span>
            <button
              onClick={async () => {
                const a = msg.action!
                setMsg(null)
                await a.run()
              }}
              className="press shrink-0 min-h-11 px-4 rounded-full bg-primary text-primary-ink"
            >
              {msg.action.label}
            </button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
