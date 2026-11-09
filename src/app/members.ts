import { useRows } from '@/sync/store'
import { useSession, type Member } from './session'

/** Les membres du foyer : moi, mon binôme, et une fonction pour retrouver qui a fait quoi. */
export function useMembers() {
  const { identity } = useSession()
  const members = useRows<Member>('members') ?? []
  const me = members.find((m) => m.id === identity?.memberId)
  const partner = members.find((m) => m.id !== identity?.memberId)
  const byId = (id: string | null | undefined) => members.find((m) => m.id === id)
  return { members, me, partner, byId }
}
