import Dexie, { type Table } from 'dexie'

/**
 * File d'envoi des photos : une photo est d'abord rangée sur le téléphone
 * (IndexedDB), le souvenir est enregistré tout de suite avec son chemin
 * définitif, puis l'envoi se fait dès que le réseau le permet.
 */
export interface PendingUpload {
  path: string
  blob: Blob
  createdAt: number
  attempts: number
  lastError?: string
}

export type UploadResult = 'ok' | 'network' | 'error'

class UploadDb extends Dexie {
  uploads!: Table<PendingUpload, string>
  constructor(name: string) {
    super(name)
    this.version(1).stores({ uploads: 'path, createdAt' })
  }
}

export class PhotoQueue {
  private db: UploadDb
  private running: Promise<void> | null = null
  private listeners = new Set<(n: number) => void>()

  constructor(
    private upload: (path: string, blob: Blob) => Promise<UploadResult>,
    dbName = 'bibouns-uploads',
  ) {
    this.db = new UploadDb(dbName)
  }

  onCount(fn: (n: number) => void) {
    this.listeners.add(fn)
    void this.count().then(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }
  private async notify() {
    const n = await this.count()
    for (const fn of this.listeners) fn(n)
  }

  count() {
    return this.db.uploads.count()
  }

  /** Range la photo et tente l'envoi en arrière-plan. */
  async enqueue(path: string, blob: Blob): Promise<void> {
    await this.db.uploads.put({ path, blob, createdAt: Date.now(), attempts: 0 })
    await this.notify()
    void this.flush()
  }

  /** Copie locale d'une photo pas encore envoyée (pour l'afficher). */
  async local(path: string): Promise<Blob | undefined> {
    return (await this.db.uploads.get(path))?.blob
  }

  async forget(path: string) {
    await this.db.uploads.delete(path)
    await this.notify()
  }

  async clear() {
    await this.db.uploads.clear()
    await this.notify()
  }

  /** Envoie la file dans l'ordre ; s'arrête au premier problème de réseau. */
  flush(): Promise<void> {
    if (!this.running) {
      this.running = this.doFlush().finally(() => {
        this.running = null
      })
    }
    return this.running
  }

  private async doFlush() {
    const items = await this.db.uploads.orderBy('createdAt').toArray()
    for (const it of items) {
      let r: UploadResult
      try {
        r = await this.upload(it.path, it.blob)
      } catch {
        r = 'network'
      }
      if (r === 'ok') {
        await this.db.uploads.delete(it.path)
      } else if (r === 'network') {
        break
      } else {
        await this.db.uploads.update(it.path, { attempts: it.attempts + 1, lastError: 'refusé par le serveur' })
      }
    }
    await this.notify()
  }
}
