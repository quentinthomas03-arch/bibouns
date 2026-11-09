import { describe, expect, it } from 'vitest'
import { createECDH, createPublicKey, verify } from 'node:crypto'
// @ts-expect-error bibliothèque de référence sans types (Martin Thomson, auteur des RFC 8188/8291)
import ece from 'http_ece'
import { b64urlDecode, b64urlEncode, encryptPayload, generateVapidKeys, sendPush, vapidAuthorization } from '../supabase/functions/_shared/webpush'

function browserSubscription() {
  const ecdh = createECDH('prime256v1')
  ecdh.generateKeys()
  const auth = crypto.getRandomValues(new Uint8Array(16))
  return { ecdh, auth, sub: { endpoint: 'https://web.push.apple.com/QGuQyavXutnMHGXqLu6TEh', p256dh: b64urlEncode(new Uint8Array(ecdh.getPublicKey())), auth: b64urlEncode(auth) } }
}

describe('Web Push (RFC 8291 / 8292)', () => {
  it('base64url aller-retour', () => {
    const b = crypto.getRandomValues(new Uint8Array(33))
    expect(b64urlDecode(b64urlEncode(b))).toEqual(b)
  })

  it('le navigateur (http_ece, implémentation de référence) déchiffre notre message', async () => {
    const { ecdh, auth, sub } = browserSubscription()
    const msg = JSON.stringify({ title: 'Biberon ?', body: 'Dernier repas il y a 3 h 🍼', url: './#/suivi' })
    const body = await encryptPayload(sub, new TextEncoder().encode(msg))
    const clear = ece.decrypt(Buffer.from(body), { version: 'aes128gcm', privateKey: ecdh, authSecret: Buffer.from(auth) })
    expect(clear.toString('utf8')).toBe(msg)
  })

  it('chaque envoi utilise un sel et une clé éphémère différents', async () => {
    const { sub } = browserSubscription()
    const a = await encryptPayload(sub, new Uint8Array([1, 2, 3]))
    const b = await encryptPayload(sub, new Uint8Array([1, 2, 3]))
    expect(b64urlEncode(a.slice(0, 16))).not.toBe(b64urlEncode(b.slice(0, 16)))
    expect(a[20]).toBe(65) // idlen
  })

  it('refuse des clés d’abonnement invalides', async () => {
    await expect(encryptPayload({ endpoint: 'https://x', p256dh: 'AAAA', auth: 'AAAA' }, new Uint8Array(1))).rejects.toThrow()
  })

  it('JWT VAPID signé ES256, vérifiable avec la clé publique', async () => {
    const keys = await generateVapidKeys()
    const h = await vapidAuthorization('https://web.push.apple.com/abc', keys, 'https://exemple.supabase.co', 1_800_000_000)
    const m = h.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/)!
    expect(m).not.toBeNull()
    const claims = JSON.parse(Buffer.from(b64urlDecode(m[2])).toString())
    expect(claims).toEqual({ aud: 'https://web.push.apple.com', exp: 1_800_000_000 + 43200, sub: 'https://exemple.supabase.co' })
    expect(m[4]).toBe(keys.publicKey)
    const pub = createPublicKey({ key: { ...keys.privateJwk, d: undefined, key_ops: undefined }, format: 'jwk' })
    const ok = verify('sha256', Buffer.from(`${m[1]}.${m[2]}`), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(b64urlDecode(m[3])))
    expect(ok).toBe(true)
  })

  it('envoi : en-têtes conformes et abonnement expiré détecté', async () => {
    const { sub } = browserSubscription()
    const keys = await generateVapidKeys()
    let seen: RequestInit | undefined
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      seen = init
      return new Response(null, { status: 410 })
    }) as unknown as typeof fetch
    const r = await sendPush(sub, { title: 't', body: 'b' }, keys, 'https://exemple.supabase.co', fakeFetch)
    expect(r).toEqual({ ok: false, status: 410, gone: true })
    const h = seen!.headers as Record<string, string>
    expect(h['Content-Encoding']).toBe('aes128gcm')
    expect(h.TTL).toBe('86400')
    expect(h.Authorization).toMatch(/^vapid t=.+, k=.+$/)
  })
})
