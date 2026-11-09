import { Biboun } from '@/components/Biboun'

/** Affiché tant que Supabase n'est pas branché (première mise en ligne). */
export function ConfigMissing() {
  return (
    <main className="min-h-dvh px-6 pt-safe max-w-lg mx-auto flex flex-col justify-center items-center text-center gap-4">
      <Biboun size={130} mood="sleepy" className="animate-float" />
      <h1 className="text-3xl font-semibold">Biboun’s se prépare…</h1>
      <p className="text-ink-soft">
        L’appli est en ligne, mais pas encore reliée à sa base de données. Suis l’étape « Configurer Supabase » du README, puis recharge cette page.
      </p>
    </main>
  )
}
