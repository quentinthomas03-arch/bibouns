import { beforeEach, describe, expect, it } from 'vitest'
import { BibDb } from '../src/sync/db'
import { SyncEngine } from '../src/sync/engine'
import type { BaseRow } from '../src/sync/tables'
import { FakeRemote } from './fake-remote'

const HID = '00000000-0000-0000-0000-0000000000aa'
let n = 0
const note = (id: string, body: string, updated_at: string): BaseRow => ({ id, household_id: HID, body, updated_at })

function phone(remote: FakeRemote) {
  const db = new BibDb(`test-${++n}`)
  const engine = new SyncEngine(db, remote, HID, ['notes', 'members', 'checklists', 'checklist_items'])
  return { db, engine }
}

describe('synchro hors ligne', () => {
  let remote: FakeRemote
  beforeEach(() => {
    remote = new FakeRemote()
  })

  it('met en file les saisies hors ligne puis les envoie au retour du réseau', async () => {
    const { db, engine } = phone(remote)
    remote.online = false
    await engine.write('notes', note('n1', 'biberon 120 ml', '2026-01-01T10:00:00Z'))
    await engine.write('notes', note('n2', 'couche', '2026-01-01T10:05:00Z'))
    await engine.flush()
    expect(engine.status.state).toBe('offline')
    expect(await db.outbox.count()).toBe(2)
    expect(await db.table('notes').count()).toBe(2) // visible localement tout de suite
    expect(remote.data.get('notes')).toBeUndefined()

    remote.online = true
    await engine.syncNow()
    expect(await db.outbox.count()).toBe(0)
    expect(remote.data.get('notes')!.size).toBe(2)
    expect(engine.status.state).toBe('idle')
  })

  it("ne crée pas de doublon si l'envoi est rejoué (coupure après réception serveur)", async () => {
    const { db, engine } = phone(remote)
    remote.online = false
    await engine.write('notes', note('n1', 'a', '2026-01-01T10:00:00Z'))
    remote.online = true
    // Le serveur reçoit la ligne mais la réponse se perd : on simule un 2e envoi identique.
    await remote.upsert('notes', [{ ...note('n1', 'a', '2026-01-01T10:00:00Z') }])
    await engine.flush()
    expect(remote.data.get('notes')!.size).toBe(1)
    expect(await db.outbox.count()).toBe(0)
  })

  it('regroupe plusieurs modifs de la même ligne et garde la dernière', async () => {
    const { engine } = phone(remote)
    remote.online = false
    await engine.write('notes', note('n1', 'v1', '2026-01-01T10:00:00Z'))
    await engine.write('notes', note('n1', 'v2', '2026-01-01T10:01:00Z'))
    await engine.write('notes', note('n1', 'v3', '2026-01-01T10:02:00Z'))
    remote.online = true
    const before = remote.calls
    await engine.flush()
    expect(remote.data.get('notes')!.get('n1')!.body).toBe('v3')
    expect(remote.calls - before).toBe(1) // un seul envoi
  })

  it("synchronise deux téléphones en temps réel", async () => {
    const a = phone(remote)
    const b = phone(remote)
    a.engine.start()
    b.engine.start()
    await a.engine.write('notes', note('n1', 'Coucou Aude', '2026-01-01T10:00:00Z'))
    await a.engine.flush()
    await new Promise((r) => setTimeout(r, 10))
    const got = (await b.db.table('notes').get('n1')) as BaseRow
    expect(got.body).toBe('Coucou Aude')
    a.engine.stop()
    b.engine.stop()
  })

  it('rattrape les modifs manquées via le curseur (pull)', async () => {
    const { db, engine } = phone(remote)
    remote.serverWrite('notes', note('n1', 'faite par Aude', '2026-01-01T10:00:00Z'))
    remote.serverWrite('notes', note('n2', 'faite par Aude 2', '2026-01-01T10:00:01Z'))
    await engine.pull()
    expect(await db.table('notes').count()).toBe(2)
    remote.serverWrite('notes', note('n3', 'plus tard', '2026-01-01T11:00:00Z'))
    await engine.pull()
    expect(await db.table('notes').count()).toBe(3)
  })

  it("la dernière modification gagne, même si l'ancienne arrive après (hors ligne)", async () => {
    const quentin = phone(remote)
    const aude = phone(remote)
    remote.serverWrite('notes', note('n1', 'original', '2026-01-01T09:00:00Z'))
    await quentin.engine.pull()
    await aude.engine.pull()

    // Quentin modifie hors ligne à 10h, Aude modifie en ligne à 11h
    remote.online = false
    await quentin.engine.write('notes', note('n1', 'Quentin 10h', '2026-01-01T10:00:00Z'))
    remote.online = true
    await aude.engine.write('notes', note('n1', 'Aude 11h', '2026-01-01T11:00:00Z'))
    await aude.engine.flush()

    // Quentin retrouve le réseau : sa modif plus ancienne ne doit pas écraser celle d'Aude
    await quentin.engine.syncNow()
    expect(remote.data.get('notes')!.get('n1')!.body).toBe('Aude 11h')
    const local = (await quentin.db.table('notes').get('n1')) as BaseRow
    expect(local.body).toBe('Aude 11h')
  })

  it("n'écrase pas une modif locale en attente avec une version serveur", async () => {
    const { db, engine } = phone(remote)
    remote.online = false
    await engine.write('notes', note('n1', 'local', '2026-01-01T10:00:00Z'))
    await engine.merge('notes', { ...note('n1', 'serveur', '2026-01-01T12:00:00Z'), synced_at: '2026-01-01T12:00:00Z' })
    expect(((await db.table('notes').get('n1')) as BaseRow).body).toBe('local')
  })

  it("une ligne refusée par le serveur ne bloque pas les autres", async () => {
    const { db, engine } = phone(remote)
    remote.rejectIds.add('bad')
    await engine.write('notes', note('bad', 'x', '2026-01-01T10:00:00Z'))
    await engine.write('notes', note('ok', 'y', '2026-01-01T10:00:01Z'))
    await engine.flush()
    expect(remote.data.get('notes')!.has('ok')).toBe(true)
    for (let i = 0; i < 5; i++) await engine.flush()
    expect(await db.outbox.count()).toBe(0)
    expect(await db.deadletter.count()).toBe(1) // mise de côté, pas perdue
  })

  it('envoie les listes avant leurs éléments', async () => {
    const { engine } = phone(remote)
    remote.online = false
    await engine.write('checklists', { id: 'l1', household_id: HID, title: 'Valise', updated_at: '2026-01-01T10:00:00Z' })
    await engine.write('checklist_items', { id: 'i1', household_id: HID, checklist_id: 'l1', label: 'Pyjama', updated_at: '2026-01-01T10:00:01Z' })
    remote.online = true
    const order: string[] = []
    const orig = remote.upsert.bind(remote)
    remote.upsert = async (t, rows) => {
      order.push(t)
      return orig(t, rows)
    }
    await engine.flush()
    expect(order).toEqual(['checklists', 'checklist_items'])
  })

  it('met à jour partiellement un profil membre', async () => {
    const { db, engine } = phone(remote)
    remote.serverWrite('members', { id: 'm1', household_id: HID, first_name: 'Quentin', color: '#000', updated_at: '2026-01-01T09:00:00Z' })
    await engine.pull()
    await engine.patch('members', 'm1', { avatar: '🦊' })
    await engine.flush()
    expect(remote.data.get('members')!.get('m1')!.avatar).toBe('🦊')
    expect(((await db.table('members').get('m1')) as BaseRow).first_name).toBe('Quentin')
  })
})
