import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, ShieldCheck, ScrollText, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/superadmin/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/superadmin/schools', icon: Building2, label: 'Établissements' },
  { to: '/superadmin/admins', icon: ShieldCheck, label: 'Administrateurs' },
  { to: '/superadmin/logs', icon: ScrollText, label: 'Logs & Activité' },
  { to: '/superadmin/settings', icon: Settings, label: 'Paramètres' },
];

export default function SuperAdminNavigation() {
  return (
    <nav aria-label="Navigation plateforme">
      <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-white/35">Plateforme</p>
      <ul className="flex flex-col gap-1" role="menu">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <li key={to} role="none">
            <NavLink
              to={to}
              end={end}
              role="menuitem"
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
                  <Icon size={18} className={isActive ? 'text-[#e8c579]' : ''} aria-hidden="true" />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
