import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell, Building2, ChevronDown, ChevronLeft, LayoutDashboard, LogOut, Menu, Search,
  Settings, ShieldCheck, UserPlus, X,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { Avatar, Button } from '../ui';

const nav = [
  { to: '/superadmin/dashboard', label: 'Vue plateforme', icon: LayoutDashboard },
  { to: '/superadmin/schools', label: 'Etablissements', icon: Building2 },
  { to: '/superadmin/admins', label: 'Admins etablissements', icon: UserPlus },
  { to: '/superadmin/settings', label: 'Parametres plateforme', icon: Settings },
];

export default function SuperAdminLayout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Super Admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const value = query.trim().toLowerCase();
    if (!value) return;
    const target = nav.find((item) => item.label.toLowerCase().includes(value));
    if (target) navigate(target.to);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {open && <button className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setOpen(false)} aria-label="Fermer le menu" />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${collapsed ? 'lg:w-20' : 'lg:w-72'} ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} w-72`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white"><ShieldCheck size={22} /></span>
            {!collapsed && (
              <div>
                <p className="text-sm font-extrabold tracking-tight">EduGestion</p>
                <p className="text-xs text-slate-500">Console plateforme</p>
              </div>
            )}
          </div>
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
                className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
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
            {!collapsed && 'Reduire'}
          </button>
          <button className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50" onClick={handleLogout}>
            <LogOut size={18} />
            {!collapsed && 'Deconnexion'}
          </button>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}><Menu size={22} /></button>
            <form className="hidden max-w-xl flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex" onSubmit={handleSearch}>
              <Search size={18} className="text-slate-400" />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Recherche: etablissement, ville, admin..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </form>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Button variant="ghost" className="px-3" onClick={() => setNotificationsOpen((value) => !value)}><Bell size={18} /></Button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                    <p className="px-2 pb-2 text-sm font-bold">Notifications plateforme</p>
                    {['Nouvelle demande de creation', 'Verification des admins a completer', 'Sauvegarde services OK'].map((item) => (
                      <button key={item} className="block w-full rounded-lg px-2 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">{item}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50" onClick={() => setUserMenuOpen((value) => !value)}>
                  <Avatar name={name} />
                  <div className="hidden sm:block">
                    <p className="text-sm font-bold leading-none">{name}</p>
                    <p className="mt-1 text-xs text-slate-500">superadmin</p>
                  </div>
                  <ChevronDown size={16} className="hidden text-slate-400 sm:block" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    <button className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => navigate('/superadmin/settings')}>Parametres plateforme</button>
                    <button className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => navigate('/superadmin/schools')}>Etablissements</button>
                    <button className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50" onClick={handleLogout}>Deconnexion</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
