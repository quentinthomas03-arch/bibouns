import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Configuration injectée au moment du build (GitHub Actions).
 * Ces deux valeurs sont PUBLIQUES par conception : la sécurité repose sur
 * la Row Level Security côté base, pas sur le secret de ces clés.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url!, key!, {
      auth: {
        persistSession: true, // session conservée sur le téléphone
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'bibouns-auth',
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null
