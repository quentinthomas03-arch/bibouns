import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isConfigured, supabase } from '@/lib/supabase'
import { BibDb } from '@/sync/db'
import { SyncEngine, type SyncStatus } from '@/sync/engine'
import { SupabaseRemote } from '@/sync/supabaseRemote'
import { LocalRemote } from '@/sync/localRemote'
import { saveRow, stableId, type Ctx } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'

/**
 * Session : qui suis-je, dans quel foyer, et démarrage de la synchro.
 *
 * Offline-first : l'identité (foyer + membre) est mémorisée sur le téléphone,
 * donc l'appli s'ouvre instantanément même sans réseau.
 */

export interface Identity {
  userId: string
  householdId: string
  memberId: string
}

type Status = 'loading' | 'unconfigured' | 'onboarding' | 'ready'

interface RpcResult {
  ok: boolean
  error?: string
  household_id?: string
  member_id?: string
  invite_code?: string
  recovery_code?: string
}

interface SessionValue {
  status: Status
  identity: Identity | null
  ctx: Ctx | null
  sync: SyncStatus | null
  /** Appelle une RPC d'onboarding (crée une session anonyme si besoin). */
  rpc: (fn: 'create_household' | 'join_household' | 'recover_member', args: Record<string, unknown>) => Promise<RpcResult>
  /** Entre dans l'appli après l'onboarding. */
  enter: (r: RpcResult, initialSettings?: Record<string, unknown>) => Promise<void>
  signOut: () => Promise<void>
}

const IDENTITY_KEY = 'bibouns.identity'
/** Mode démo (npm run dev:demo) : aucune donnée ne quitte le téléphone. Jamais actif en ligne. */
const DEMO = import.meta.env.DEV && import.meta.env.VITE_DEMO === '1'
const configured = isConfigured || DEMO
const SessionCtx = createContext<SessionValue | null>(null)

function readIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY)
    return raw ? (JSON.parse(raw) as Identity) : null
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(() => (configured ? readIdentity() : null))
  const [status, setStatus] = useState<Status>(() => (!configured ? 'unconfigured' : identity ? 'ready' : 'loading'))
  const [sync, setSync] = useState<SyncStatus | null>(null)
  const pendingSettings = useRef<Record<string, unknown> | null>(null)

  // Au démarrage sans identité mémorisée : la session existe-t-elle déjà côté serveur ?
  useEffect(() => {
    if (DEMO && !identity) setStatus('onboarding')
    if (!supabase || identity) return
    let cancelled = false
    void (async () => {
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user.id
      if (uid) {
        const { data: m } = await supabase.from('members').select('id,household_id').eq('user_id', uid).maybeSingle()
        if (!cancelled && m) {
          const id = { userId: uid, householdId: m.household_id as string, memberId: m.id as string }
          localStorage.setItem(IDENTITY_KEY, JSON.stringify(id))
          setIdentity(id)
          setStatus('ready')
          return
        }
      }
      if (!cancelled) setStatus('onboarding')
    })()
    return () => {
      cancelled = true
    }
  }, [identity])

  // Base locale + moteur de synchro pour le foyer courant
  const ctx = useMemo<Ctx | null>(() => {
    if (!identity || (!supabase && !DEMO)) return null
    const db = new BibDb(`bibouns-${identity.householdId}`)
    const remote = DEMO ? new LocalRemote() : new SupabaseRemote(supabase!)
    const engine = new SyncEngine(db, remote, identity.householdId)
    if (DEMO) void seedDemo(db, identity)
    return { db, engine, householdId: identity.householdId, memberId: identity.memberId }
  }, [identity])

  useEffect(() => {
    if (!ctx) return
    const off = ctx.engine.onStatus(setSync)
    ctx.engine.start()
    // Réglages saisis pendant l'onboarding (ex. date prévue)
    if (pendingSettings.current) {
      const entries = Object.entries(pendingSettings.current)
      pendingSettings.current = null
      void (async () => {
        for (const [key, value] of entries) {
          await saveRow(ctx, 'settings', { id: stableId(ctx.householdId, 'setting', key), key, value })
        }
      })()
    }
    return () => {
      off()
      ctx.engine.stop()
    }
  }, [ctx])

  // Ce téléphone est-il toujours rattaché à son profil ? (le profil a pu être
  // récupéré sur un nouveau téléphone avec le code de secours)
  useEffect(() => {
    if (!supabase || !identity) return
    void (async () => {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) return
      const { data, error } = await supabase.from('members').select('id').eq('id', identity.memberId).eq('user_id', s.session.user.id).maybeSingle()
      if (!error && !data) await signOutRef.current()
    })()
  }, [identity])

  // Si la session est révoquée (ex. profil récupéré sur un autre téléphone)
  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(IDENTITY_KEY)
        setIdentity(null)
        setStatus('onboarding')
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const rpc = useCallback<SessionValue['rpc']>(async (fn, args) => {
    if (DEMO) {
      return { ok: true, household_id: 'demo-household', member_id: 'demo-me', invite_code: 'BIB7K2', recovery_code: 'ABCD-EFGH-JKMN-PQRS' }
    }
    if (!supabase) return { ok: false, error: 'inconnu' }
    try {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) return { ok: false, error: /fetch|network|load failed/i.test(error.message) ? 'reseau' : 'non_connecte' }
      }
      const { data, error } = await supabase.rpc(fn, args)
      if (error) return { ok: false, error: /fetch|network|load failed/i.test(error.message) ? 'reseau' : 'inconnu' }
      return data as RpcResult
    } catch {
      return { ok: false, error: 'reseau' }
    }
  }, [])

  const enter = useCallback<SessionValue['enter']>(async (r, initialSettings) => {
    if ((!supabase && !DEMO) || !r.household_id || !r.member_id) return
    const userId = DEMO ? 'demo-user' : (await supabase!.auth.getSession()).data.session!.user.id
    const id: Identity = { userId, householdId: r.household_id, memberId: r.member_id }
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(id))
    pendingSettings.current = initialSettings ?? null
    setIdentity(id)
    setStatus('ready')
  }, [])

  const signOut = useCallback(async () => {
    if (ctx) {
      ctx.engine.stop()
      ctx.db.close()
      await ctx.db.delete()
    }
    localStorage.removeItem(IDENTITY_KEY)
    await supabase?.auth.signOut({ scope: 'local' })
    setIdentity(null)
    setStatus('onboarding')
  }, [ctx])

  const signOutRef = useRef(signOut)
  signOutRef.current = signOut

  const value = useMemo(() => ({ status, identity, ctx, sync, rpc, enter, signOut }), [status, identity, ctx, sync, rpc, enter, signOut])
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export function useSession() {
  const v = useContext(SessionCtx)
  if (!v) throw new Error('useSession hors SessionProvider')
  return v
}

async function seedDemo(db: BibDb, id: Identity) {
  const now = new Date().toISOString()
  const base = { household_id: id.householdId, updated_at: now, created_at: now }
  await db.rows('members').bulkPut([
    { ...base, id: id.memberId, first_name: 'Quentin', avatar: '🦊', color: '#C2603F', user_id: id.userId },
    { ...base, id: 'demo-partner', first_name: 'Aude', avatar: '🐰', color: '#E0897A', user_id: 'x' },
  ])
  await db.rows('households').put({ ...base, id: id.householdId, name: 'Les Biboun’s' })
}

/** Mon profil et celui de mon binôme. */
export interface Member extends BaseRow {
  first_name: string
  color: string
  avatar: string
  user_id: string
}
