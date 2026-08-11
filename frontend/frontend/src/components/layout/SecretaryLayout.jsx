import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, ClipboardList, LogOut, Menu, Search, X } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import { APP_NAME } from '../../utils/brand';
import { buildSecretaryNav, NAV_ICONS } from '../../utils/navConfig';
import BrandMark from '../BrandMark';
import { Avatar, Button } from '../ui';

export default function SecretaryLayout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const { user, logout } = useAuth();
  const { labels: ui, kind, schoolName } = useEstablishmentProfile();
  const nav = useMemo(() => buildSecretaryNav(ui).map((item) => ({
    ...item,
    icon: NAV_ICONS[item.icon] || ClipboardList,
  })), [ui]);
  const navigate = useNavigate();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Secrétaire';

  useEffect(() => {
    document.title = schoolName ? `${schoolName} — ${APP_NAME}` : APP_NAME;
  }, [schoolName]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleSearch(event) {
    event.preventDefault();
    const value = query.trim().toLowerCase();
    const target = nav.find((item) => item.label.toLowerCase().includes(value));
    if (target) navigate(target.to);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {open && <button className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setOpen(false)} aria-label="Fermer le menu" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${collapsed ? 'lg:w-20' : 'lg:w-72'} ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} w-72`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <BrandMark
            schoolName={schoolName}
            kind={kind}
            subtitle={schoolName ? `${APP_NAME} · Secrétariat` : 'Secrétariat'}
            collapsed={collapsed}
            icon={ClipboardList}
            iconClassName="bg-violet-600"
          />
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                <Icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button className="hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 lg:flex" onClick={() => setCollapsed((v) => !v)}>
            <ChevronLeft className={`transition ${collapsed ? 'rotate-180' : ''}`} size={18} />
            {!collapsed && 'Réduire'}
          </button>
          <button className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50" onClick={handleLogout}>
            <LogOut size={18} />
            {!collapsed && 'Déconnexion'}
          </button>
        </div>
      </aside>
      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}><Menu size={22} /></button>
            <form className="hidden max-w-xl flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex" onSubmit={handleSearch}>
              <Search size={18} className="text-slate-400" />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Rechercher un apprenant, une inscription…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </form>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" className="px-3"><Bell size={18} /></Button>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <Avatar name={name} />
                <div className="hidden sm:block">
                  <p className="text-sm font-bold leading-none">{name}</p>
                  <p className="mt-1 text-xs text-slate-500">secrétaire</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
