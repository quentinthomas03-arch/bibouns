import { supabase } from './supabase'

/** iPhone : les notifications web ne marchent que dans l'appli installée (iOS ≥ 16.4). */
export function pushSupport(): 'ok' | 'install' | 'unsupported' {
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return ios && !standalone ? 'install' : 'unsupported'
  if (ios && !standalone) return 'install'
  return 'ok'
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function publicKey(): Promise<string> {
  if (!supabase) throw new Error('Indisponible en mode démo')
  const { data } = await supabase.rpc('push_public_key')
  if (data) return data as string
  // clés pas encore créées : on demande à la fonction de les initialiser
  const r = await supabase.functions.invoke('push', { body: { action: 'init' } })
  if (r.error || !r.data?.publicKey) throw new Error('Service de notifications pas encore prêt. Réessaie dans quelques minutes.')
  return r.data.publicKey as string
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker?.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

/** Demande l'autorisation (doit suivre un tap) et enregistre l'abonnement de ce téléphone. */
export async function enablePush(householdId: string, memberId: string): Promise<void> {
  if (!supabase) throw new Error('Indisponible en mode démo')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Autorisation refusée. Réglages iPhone → Notifications → Biboun’s pour l’activer.')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(await publicKey()) })
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  await supabase.from('push_subscriptions').delete().eq('endpoint', json.endpoint)
  const { error } = await supabase.from('push_subscriptions').insert({
    household_id: householdId,
    member_id: memberId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: navigator.userAgent.slice(0, 200),
  })
  if (error) throw new Error('Enregistrement impossible (réseau ?)')
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription()
  if (!sub) return
  await supabase?.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export async function sendTestPush(): Promise<number> {
  if (!supabase) throw new Error('Indisponible en mode démo')
  const { data, error } = await supabase.functions.invoke('push', { body: { action: 'test' } })
  if (error) throw new Error('Envoi impossible (réseau ?)')
  return (data?.sent as number) ?? 0
}

/** Prévient le binôme (mot doux, tâche attribuée). Silencieux en cas d'échec. */
export function notifyPartner(type: 'note' | 'assigned', id: string): void {
  if (!supabase || !navigator.onLine) return
  void supabase.functions.invoke('push', { body: { action: 'notify', type, id } }).catch(() => undefined)
}
