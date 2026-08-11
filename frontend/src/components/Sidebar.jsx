import { NavLink } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, PencilLine, FileText, LogOut, School } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { APP_NAME } from '../utils/brand';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/eleves', icon: GraduationCap, label: 'Élèves' },
  { to: '/notes', icon: PencilLine, label: 'Notes' },
  { to: '/bulletin', icon: FileText, label: 'Bulletins' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  const name = user?.username || 'Utilisateur';
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col bg-[#101F3C]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#B8863B] text-white shadow-sm">
          <School size={22} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold tracking-tight text-white">{APP_NAME}</p>
          <p className="truncate text-xs text-white/50">Gestion scolaire</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <p className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-wider text-white/35">
          Menu principal
        </p>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-gradient-to-r from-[#B8863B]/25 to-transparent text-white'
                      : 'text-white/65 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`absolute left-0 top-1/2 h-4/6 w-[3px] -translate-y-1/2 rounded-full bg-[#e8c579] transition-opacity ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                      aria-hidden="true"
                    />
                    <Icon size={19} className={isActive ? 'text-[#e8c579]' : ''} />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer utilisateur */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B8863B] text-xs font-bold text-white">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{user?.username}</p>
            <p className="truncate text-xs capitalize text-white/50">{user?.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
