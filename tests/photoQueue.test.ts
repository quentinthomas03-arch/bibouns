import { describe, expect, it } from 'vitest'
import { PhotoQueue, type UploadResult } from '../src/lib/photoQueue'

let n = 0
function setup(results: UploadResult[]) {
  const sent: string[] = []
  const q = new PhotoQueue(async (path) => {
    const r = results.shift() ?? 'ok'
    if (r === 'ok') sent.push(path)
    return r
  }, `uploads-test-${++n}`)
  return { q, sent }
}
const blob = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })

describe('file d’envoi des photos', () => {
  it('hors ligne : la photo reste sur le téléphone et reste affichable', async () => {
    const { q, sent } = setup(['network'])
    await q.enqueue('h/memories/a.jpg', blob())
    await q.flush()
    expect(sent).toEqual([])
    expect(await q.count()).toBe(1)
    expect(await q.local('h/memories/a.jpg')).toBeDefined()
  })
  it('au retour du réseau : envoyée puis retirée de la file, dans l’ordre', async () => {
    const { q, sent } = setup(['network', 'network'])
    await q.enqueue('h/memories/a.jpg', blob())
    await q.flush()
    await q.enqueue('h/memories/b.jpg', blob())
    await q.flush()
    await q.flush()
    expect(sent).toEqual(['h/memories/a.jpg', 'h/memories/b.jpg'])
    expect(await q.count()).toBe(0)
    expect(await q.local('h/memories/a.jpg')).toBeUndefined()
  })
  it('un refus du serveur ne bloque pas les autres photos', async () => {
    const { q, sent } = setup(['network', 'error', 'ok'])
    await q.enqueue('h/x/1.jpg', blob())
    await new Promise((r) => setTimeout(r, 5))
    await q.enqueue('h/x/2.jpg', blob())
    await q.flush()
    expect(sent).toEqual(['h/x/2.jpg'])
    expect(await q.count()).toBe(1)
  })
  it('compteur pour l’affichage', async () => {
    const { q } = setup(['network', 'network'])
    const seen: number[] = []
    q.onCount((c) => seen.push(c))
    await q.enqueue('h/x/1.jpg', blob())
    await q.flush()
    expect(seen.at(-1)).toBe(1)
  })
})
