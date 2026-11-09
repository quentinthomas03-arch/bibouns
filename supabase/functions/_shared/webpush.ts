/**
 * Web Push sans dépendance, uniquement avec WebCrypto (Deno, navigateurs, Node ≥ 20).
 *   - chiffrement du message : RFC 8291 (aes128gcm, RFC 8188)
 *   - authentification serveur : RFC 8292 (VAPID, JWT ES256)
 * Testé contre la bibliothèque de référence http_ece (tests/webpush.test.ts).
 */

const enc = new TextEncoder()
/** Octets adossés à un ArrayBuffer (exigé par WebCrypto et fetch). */
type Bytes = Uint8Array<ArrayBuffer>
const utf8 = (s: string): Bytes => new Uint8Array(enc.encode(s))

export function b64urlEncode(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function b64urlDecode(str: string): Bytes {
  const pad = '='.repeat((4 - (str.length % 4)) % 4)
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, length: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8)
  return new Uint8Array(bits)
}

export interface PushSubscriptionKeys {
  endpoint: string
  p256dh: string // clé publique du navigateur (base64url, 65 octets)
  auth: string // secret d'authentification (base64url, 16 octets)
}

/** Chiffre `payload` pour un abonnement (corps prêt à envoyer, en-tête aes128gcm inclus). */
export async function encryptPayload(sub: PushSubscriptionKeys, payload: Uint8Array, opts: { salt?: Bytes; serverKeys?: CryptoKeyPair } = {}): Promise<Bytes> {
  const uaPublic = b64urlDecode(sub.p256dh)
  const authSecret = b64urlDecode(sub.auth)
  if (uaPublic.length !== 65 || authSecret.length !== 16) throw new Error('Clés d’abonnement invalides')

  const server = opts.serverKeys ?? ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair)
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', server.publicKey))
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, server.privateKey, 256))

  // RFC 8291 §3.4
  const keyInfo = concat(utf8('WebPush: info\0'), uaPublic, asPublic)
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32)
  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12)

  // Un seul enregistrement : contenu + délimiteur 0x02 (dernier enregistrement)
  const plaintext = concat(payload, new Uint8Array([2]))
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext))

  // En-tête RFC 8188 : salt(16) | rs(4) | idlen(1) | keyid(65)
  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096)
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ciphertext)
}

// ------------------------------------------------------------------ VAPID
export interface VapidKeys {
  publicKey: string // base64url, point non compressé (65 octets)
  privateJwk: JsonWebKey
}

export async function generateVapidKeys(): Promise<VapidKeys> {
  const kp = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))
  return { publicKey: b64urlEncode(raw), privateJwk: await crypto.subtle.exportKey('jwk', kp.privateKey) }
}

/** En-tête Authorization VAPID pour un endpoint donné (valable 12 h). */
export async function vapidAuthorization(endpoint: string, keys: VapidKeys, subject: string, now = Math.floor(Date.now() / 1000)): Promise<string> {
  const aud = new URL(endpoint).origin
  const header = b64urlEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64urlEncode(enc.encode(JSON.stringify({ aud, exp: now + 12 * 3600, sub: subject })))
  const unsigned = `${header}.${claims}`
  const key = await crypto.subtle.importKey('jwk', keys.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  // WebCrypto renvoie la signature au format r||s (64 octets), celui attendu par JWS
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(unsigned)))
  return `vapid t=${unsigned}.${b64urlEncode(sig)}, k=${keys.publicKey}`
}

export interface PushMessage {
  title: string
  body: string
  url?: string
  tag?: string
}

export interface SendResult {
  ok: boolean
  status: number
  /** abonnement expiré/révoqué : à supprimer */
  gone: boolean
}

/** Envoie une notification. TTL 24 h, urgence normale. */
export async function sendPush(sub: PushSubscriptionKeys, msg: PushMessage, keys: VapidKeys, subject: string, fetchImpl: typeof fetch = fetch): Promise<SendResult> {
  const body = await encryptPayload(sub, utf8(JSON.stringify(msg)))
  const res = await fetchImpl(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(sub.endpoint, keys, subject),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal',
    },
    body,
  })
  return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 }
}
