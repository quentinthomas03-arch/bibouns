import type { Remote } from './remote'

/** "Serveur" vide pour le mode démo (développement uniquement) : tout reste local. */
export class LocalRemote implements Remote {
  async upsert() {}
  async update() {}
  async pullSince() {
    return []
  }
  subscribe(_h: string, _t: unknown, _r: unknown, onStatus: (s: 'live') => void) {
    onStatus('live')
    return () => {}
  }
}
