import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { BibDb } from '../src/sync/db'

describe('mise à jour de la base locale', () => {
  it('une base v1 existante passe en v2 sans perdre ses données', async () => {
    const name = 'upgrade-test'
    const v1 = new Dexie(name)
    v1.version(1).stores({ outbox: '++seq, [table+rowId]', deadletter: '++seq', meta: 'key', notes: 'id, synced_at, updated_at, created_at' })
    await v1.table('notes').put({ id: 'n1', body: 'avant la mise à jour', updated_at: 'x' })
    v1.close()
    const v2 = new BibDb(name)
    expect(((await v2.table('notes').get('n1')) as { body: string }).body).toBe('avant la mise à jour')
    await v2.table('letters').put({ id: 'l1', body: 'Coucou Biboun', updated_at: 'x' })
    expect(await v2.table('letters').count()).toBe(1)
    v2.close()
  })
})
