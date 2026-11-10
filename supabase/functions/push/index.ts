// =============================================================================
// Fonction "push" (Supabase Edge Function, Deno)
//   POST {action:"init"}   : crée les clés VAPID si absentes (idempotent, public)
//   POST {action:"tick"}   : appelée par le cron toutes les 5 min (secret requis)
//   POST {action:"notify", type:"note"|"assigned", id} : prévient le binôme (connecté)
//   POST {action:"test"}   : notification de test sur mes appareils (connecté)
// Aucune donnée ne quitte Supabase, sauf le message chiffré envoyé au service
// de notification d'Apple/Google (qui ne peut pas le lire).
// =============================================================================
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { generateVapidKeys, sendPush, type PushMessage, type VapidKeys } from '../_shared/webpush.ts'
import { computeReminders, DEFAULT_PREFS, type Prefs } from '../_shared/reminders.ts'
import { VACCINE_DOSES } from '../_shared/vaccines.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')!
const SUBJECT = SUPABASE_URL // "sub" VAPID : URL https du projet

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type Db = SupabaseClient

async function config(db: Db) {
  const { data } = await db.from('push_config').select('*').eq('id', 1).single()
  return data as { vapid_public: string | null; vapid_private_jwk: JsonWebKey | null; cron_secret: string; function_url: string | null }
}

async function ensureKeys(db: Db): Promise<VapidKeys> {
  const c = await config(db)
  const url = `${SUPABASE_URL}/functions/v1/push`
  if (c.vapid_public && c.vapid_private_jwk) {
    if (c.function_url !== url) await db.from('push_config').update({ function_url: url }).eq('id', 1)
    return { publicKey: c.vapid_public, privateJwk: c.vapid_private_jwk }
  }
  const k = await generateVapidKeys()
  // ne remplace jamais des clés existantes (course entre deux appels)
  await db.from('push_config').update({ vapid_public: k.publicKey, vapid_private_jwk: k.privateJwk, function_url: url }).eq('id', 1).is('vapid_public', null)
  const after = await config(db)
  return { publicKey: after.vapid_public!, privateJwk: after.vapid_private_jwk! }
}

async function prefsOf(db: Db, householdId: string, memberId: string): Promise<Prefs> {
  const { data } = await db.from('settings').select('value').eq('household_id', householdId).eq('key', `notif:${memberId}`).is('deleted_at', null).maybeSingle()
  return { ...DEFAULT_PREFS, ...((data?.value as Partial<Prefs>) ?? {}) }
}

/** Envoie à tous les appareils d'un membre ; nettoie les abonnements expirés. */
async function sendToMember(db: Db, keys: VapidKeys, memberId: string, msg: PushMessage): Promise<number> {
  const { data: subs } = await db.from('push_subscriptions').select('*').eq('member_id', memberId)
  let sent = 0
  for (const s of subs ?? []) {
    try {
      const r = await sendPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, msg, keys, SUBJECT)
      if (r.ok) {
        sent++
        await db.from('push_subscriptions').update({ last_ok_at: new Date().toISOString(), fail_count: 0 }).eq('id', s.id)
      } else if (r.gone || s.fail_count >= 10) {
        await db.from('push_subscriptions').delete().eq('id', s.id)
      } else {
        await db.from('push_subscriptions').update({ fail_count: s.fail_count + 1 }).eq('id', s.id)
      }
    } catch (e) {
      console.error('envoi impossible', e)
    }
  }
  return sent
}

/** Membre connecté (via le jeton de session envoyé par l'appli). */
async function caller(db: Db, req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await db.auth.getUser(token)
  if (!data.user) return null
  const { data: m } = await db.from('members').select('id, household_id, first_name').eq('user_id', data.user.id).maybeSingle()
  return m as { id: string; household_id: string; first_name: string } | null
}

async function tick(db: Db, keys: VapidKeys) {
  const now = new Date()
  const { data: households } = await db.from('households').select('id')
  let total = 0
  for (const h of households ?? []) {
    const hid = h.id as string
    const [members, appts, items, babies, vaccines, shift, medCfg, meds] = await Promise.all([
      db.from('members').select('id, first_name').eq('household_id', hid).order('created_at'),
      db.from('appointments').select('id, title, starts_at, location, remind_minutes, done, subject').eq('household_id', hid).is('deleted_at', null).gte('starts_at', now.toISOString()),
      db.from('checklist_items').select('id, label, due_date, done, assignee').eq('household_id', hid).is('deleted_at', null).eq('done', false).not('due_date', 'is', null),
      db.from('babies').select('first_name, born_at').eq('household_id', hid).is('deleted_at', null).limit(1),
      db.from('vaccines').select('code, done_on').eq('household_id', hid).is('deleted_at', null),
      db.from('settings').select('value').eq('household_id', hid).eq('key', 'night_shift').is('deleted_at', null).maybeSingle(),
      db.from('settings').select('value').eq('household_id', hid).eq('key', 'med_reminder').is('deleted_at', null).maybeSingle(),
      db.from('baby_events').select('data, started_at').eq('household_id', hid).eq('kind', 'med').is('deleted_at', null).gte('started_at', new Date(now.getTime() - 36 * 3600_000).toISOString()),
    ])
    const reminders = computeReminders({
      now,
      members: members.data ?? [],
      appointments: appts.data ?? [],
      checklistItems: items.data ?? [],
      baby: babies.data?.[0] ?? null,
      vaccineDoses: VACCINE_DOSES,
      vaccinesDone: (vaccines.data ?? []).filter((v) => v.done_on).map((v) => v.code),
      nightShift: shift.data?.value ?? null,
      medReminder: medCfg.data?.value ?? null,
      medEvents: (meds.data ?? []).map((e) => ({ name: String(e.data?.name ?? ''), started_at: e.started_at })),
    })
    for (const r of reminders) {
      // anti-doublon : la clé n'est insérée qu'une fois
      const { error } = await db.from('push_log').insert({ key: `${hid}:${r.key}` })
      if (error) continue
      for (const mid of r.memberIds) {
        const prefs = await prefsOf(db, hid, mid)
        if (!prefs[r.category]) continue
        total += await sendToMember(db, keys, mid, { title: r.title, body: r.body, url: r.url, tag: r.key })
      }
    }
  }
  return total
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST uniquement' }, 405)
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  let body: { action?: string; type?: string; id?: string } = {}
  try {
    body = await req.json()
  } catch {
    /* corps vide */
  }

  try {
    if (body.action === 'init') {
      const keys = await ensureKeys(db)
      return json({ ok: true, publicKey: keys.publicKey })
    }

    if (body.action === 'tick') {
      const c = await config(db)
      if (!c.cron_secret || req.headers.get('x-cron-secret') !== c.cron_secret) return json({ error: 'interdit' }, 403)
      const keys = await ensureKeys(db)
      return json({ ok: true, sent: await tick(db, keys) })
    }

    const me = await caller(db, req)
    if (!me) return json({ error: 'non connecté' }, 401)
    const keys = await ensureKeys(db)

    if (body.action === 'test') {
      const sent = await sendToMember(db, keys, me.id, { title: '🔔 Ça marche !', body: `Coucou ${me.first_name}, les notifications Biboun’s sont activées.`, url: './#/', tag: 'test' })
      return json({ ok: true, sent })
    }

    if (body.action === 'notify') {
      const { data: partner } = await db.from('members').select('id').eq('household_id', me.household_id).neq('id', me.id).maybeSingle()
      if (body.type === 'note' && partner) {
        const { data: note } = await db.from('notes').select('body').eq('id', body.id).eq('household_id', me.household_id).maybeSingle()
        if (!note || !(await prefsOf(db, me.household_id, partner.id)).notes) return json({ ok: true, sent: 0 })
        const sent = await sendToMember(db, keys, partner.id, { title: `💌 Mot doux de ${me.first_name}`, body: String(note.body).slice(0, 140), url: './#/', tag: `note:${body.id}` })
        return json({ ok: true, sent })
      }
      if (body.type === 'assigned') {
        const { data: item } = await db.from('checklist_items').select('label, assignee, checklist_id').eq('id', body.id).eq('household_id', me.household_id).maybeSingle()
        if (!item?.assignee || item.assignee === me.id || !(await prefsOf(db, me.household_id, item.assignee)).assigned) return json({ ok: true, sent: 0 })
        const sent = await sendToMember(db, keys, item.assignee, { title: `👉 À toi de jouer (de la part de ${me.first_name})`, body: item.label, url: `./#/listes/${item.checklist_id}`, tag: `assigned:${body.id}` })
        return json({ ok: true, sent })
      }
      return json({ ok: true, sent: 0 })
    }

    return json({ error: 'action inconnue' }, 400)
  } catch (e) {
    console.error(e)
    return json({ error: 'erreur interne' }, 500)
  }
})
