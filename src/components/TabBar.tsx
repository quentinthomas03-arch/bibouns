import { NavLink } from 'react-router-dom'
import { House, ListChecks, Plus, Activity, LayoutGrid } from 'lucide-react'
import { tabs } from '@/content/fr'

const item = 'press flex flex-col items-center justify-center gap-0.5 min-h-14 flex-1 text-xs font-bold rounded-2xl'

/** Barre d'onglets en bas + bouton d'action rapide central. */
export function TabBar({ onQuick }: { onQuick: () => void }) {
  const cls = ({ isActive }: { isActive: boolean }) => `${item} ${isActive ? 'text-primary' : 'text-ink-soft'}`
  return (
    <nav aria-label="Navigation principale" className="fixed bottom-0 inset-x-0 z-40 pb-safe">
      <div className="mx-3 mb-2 flex items-center gap-1 rounded-[2rem] bg-surface/95 backdrop-blur shadow-soft px-2 py-1 border border-line">
        <NavLink to="/" end className={cls}>
          <House size={24} aria-hidden />
          {tabs.home}
        </NavLink>
        <NavLink to="/suivi" className={cls}>
          <Activity size={24} aria-hidden />
          {tabs.track}
        </NavLink>
        <div className="flex-1 flex justify-center">
          <button
            onClick={onQuick}
            aria-label={tabs.quick}
            className="press -mt-8 size-18 rounded-full bg-primary text-primary-ink grid place-items-center shadow-soft border-4 border-bg"
          >
            <Plus size={34} strokeWidth={3} aria-hidden />
          </button>
        </div>
        <NavLink to="/listes" className={cls}>
          <ListChecks size={24} aria-hidden />
          {tabs.lists}
        </NavLink>
        <NavLink to="/plus" className={cls}>
          <LayoutGrid size={24} aria-hidden />
          {tabs.more}
        </NavLink>
      </div>
    </nav>
  )
}
