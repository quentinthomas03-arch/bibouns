import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const Ctx = createContext<(msg: string) => void>(() => {})

/** Petits messages éphémères ("Enregistré ✓"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null)
  const show = useCallback((text: string) => {
    const key = Date.now()
    setMsg({ text, key })
    setTimeout(() => setMsg((m) => (m?.key === key ? null : m)), 2200)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="fixed inset-x-0 top-0 z-[60] flex justify-center pt-safe pointer-events-none">
        {msg && (
          <div key={msg.key} className="mt-2 animate-pop rounded-full bg-ink text-bg px-5 py-3 font-bold shadow-soft">
            {msg.text}
          </div>
        )}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
