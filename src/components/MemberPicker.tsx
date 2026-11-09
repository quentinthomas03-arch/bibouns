import { useMembers } from '@/app/members'
import { Avatar } from './ui/Avatar'

/** Choisir "personne / moi / mon binôme" en un tap. */
export function MemberPicker({ value, onChange, label }: { value: string | null | undefined; onChange: (id: string | null) => void; label: string }) {
  const { me, partner } = useMembers()
  const opts = [me, partner].filter(Boolean)
  return (
    <fieldset>
      <legend className="font-bold mb-1.5 px-1">{label}</legend>
      <div className="flex gap-2">
        <button type="button" aria-pressed={!value} onClick={() => onChange(null)} className={`press flex-1 min-h-12 rounded-2xl font-bold ${!value ? 'bg-ink text-bg' : 'bg-surface-2'}`}>
          Personne
        </button>
        {opts.map((m) => (
          <button
            type="button"
            key={m!.id}
            aria-pressed={value === m!.id}
            onClick={() => onChange(m!.id)}
            className={`press flex-1 min-h-12 rounded-2xl font-bold flex items-center justify-center gap-2 ${value === m!.id ? 'bg-ink text-bg' : 'bg-surface-2'}`}
          >
            <Avatar emoji={m!.avatar} color={m!.color} size={28} />
            {m!.first_name}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
