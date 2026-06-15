import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, BookOpen, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, GraduationCap, LayoutDashboard,
  Layers, Library, Megaphone, Menu, Receipt, Search, Settings, Users, UserCog, WalletCards, X,
  BarChart3, ClipboardCheck, ClipboardList, School, LogOut, ArrowRightLeft, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { Avatar, Button } from '../ui';

// Sidebar conforme à l'ordre hiérarchique §8 du cahier des charges.
// Rubriques dépliables ; rubrique « Extra » = fonctionnalités hors cahier (conservées).
// (Référentiel MINESEC → lot P2-C ; Communication/Annonces → lot P2-D.)
const nav = [
  { to: '/app/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  {
    group: 'Structure Pédagogique', icon: Layers, items: [
      { to: '/app/classes', label: 'Classes', icon: School },
      { to: '/app/subjects', label: 'Matières', icon: BookOpen },
      { to: '/app/referentiel', label: 'Référentiel MINESEC', icon: Library },
    ],
  },
  {
    group: 'Personnel', icon: UserCog, items: [
      { to: '/app/teachers', label: 'Enseignants', icon: GraduationCap, match: { fonction: 'enseignant' } },
      { to: '/app/teachers', label: 'Direction / Administration', icon: UserCog, match: { fonction: 'direction' } },
    ],
  },
  {
    group: 'Élèves', icon: Users, items: [
      { to: '/app/students', label: 'Liste des élèves', icon: Users },
      { to: '/app/students/nouveau', label: 'Inscriptions', icon: ClipboardList },
      { to: '/app/promotions', label: 'Promotions / Passages', icon: ArrowRightLeft },
    ],
  },
  {
    group: 'Évaluations', icon: BarChart3, items: [
      { to: '/app/grades', label: 'Saisie des notes', icon: BarChart3 },
      { to: '/app/bulletins', label: 'Bulletins', icon: Receipt },
    ],
  },
  {
    group: 'Communication', icon: Bell, items: [
      { to: '/app/announcements', label: 'Annonces', icon: Megaphone },
      { to: '/app/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    group: 'Paramètres', icon: Settings, items: [
      { to: '/app/settings', label: "Profil de l'école", icon: School },
      { to: '/app/users', label: 'Utilisateurs & Droits', icon: UserCog },
    ],
  },
  {
    group: 'Extra', icon: Sparkles, items: [
      { to: '/app/parents', label: 'Parents', icon: UserCog },
      { to: '/app/schedules', label: 'Emplois du temps', icon: CalendarDays },
      { to: '/app/attendance', label: 'Présences', icon: ClipboardCheck },
      { to: '/app/payments', label: 'Paiements', icon: WalletCards },
      { to: '/app/expenses', label: 'Dépenses', icon: WalletCards },
      { to: '/app/reports', label: 'Rapports', icon: BarChart3 },
    ],
  },
];

// Tous les liens à plat (pour la recherche et le rail réduit).
const flatNav = nav.flatMap((entry) => (entry.items ? entry.items : [entry]));

export default function SaaSLayout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Admin Ecole';

  // Rubriques dépliées : toutes ouvertes par défaut, plus celle de la route active.
  const [expanded, setExpanded] = useState(() =>
    Object.fromEntries(nav.filter((e) => e.items).map((e) => [e.group, true])),
  );
  const toggleGroup = (group) => setExpanded((prev) => ({ ...prev, [group]: !prev[group] }));
  const isItemActive = (item) => {
    if (location.pathname !== item.to.split('?')[0]) return false;
    if (!item.match) return true;
    const params = new URLSearchParams(location.search);
    if (item.match.fonction === 'enseignant') return params.get('fonction') !== 'direction';
    if (item.match.fonction === 'direction') return params.get('fonction') === 'direction';
    return true;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const value = query.trim().toLowerCase();
    if (!value) return;
    const target = flatNav.find((item) => item.label.toLowerCase().includes(value));
    if (target) {
      const qs = target.match?.fonction === 'direction' ? '?fonction=direction' : '';
      navigate(`${target.to}${qs}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {open && <button className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setOpen(false)} aria-label="Fermer le menu" />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${collapsed ? 'lg:w-20' : 'lg:w-72'} ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} w-72`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><GraduationCap size={22} /></span>
            {!collapsed && (
              <div>
                <p className="text-sm font-extrabold tracking-tight">EduGestion</p>
                <p className="text-xs text-slate-500">School SaaS</p>
              </div>
            )}
          </div>
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {collapsed
            ? flatNav.map((item) => {
                const Icon = item.icon;
                const href = item.match?.fonction === 'direction' ? `${item.to}?fonction=direction` : item.to;
                return (
                  <NavLink
                    key={`${item.to}-${item.label}`}
                    to={href}
                    title={item.label}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-center rounded-xl px-3 py-2.5 transition ${
                      isItemActive(item) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={20} />
                  </NavLink>
                );
              })
            : nav.map((entry) => {
                // Lien simple (ex. Tableau de bord).
                if (!entry.items) {
                  const Icon = entry.icon;
                  return (
                    <NavLink
                      key={entry.to}
                      to={entry.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                    >
                      <Icon size={20} />
                      <span>{entry.label}</span>
                    </NavLink>
                  );
                }
                // Rubrique dépliable.
                const GroupIcon = entry.icon;
                const isOpen = expanded[entry.group];
                return (
                  <div key={entry.group}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(entry.group)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                    >
                      <GroupIcon size={18} />
                      <span className="flex-1 text-left">{entry.group}</span>
                      <ChevronRight size={15} className={`transition ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="mt-0.5 space-y-0.5 pl-3">
                        {entry.items.map((item) => {
                          const Icon = item.icon;
                          const href = item.match?.fonction === 'direction' ? `${item.to}?fonction=direction` : item.to;
                          return (
                            <NavLink
                              key={`${item.to}-${item.label}`}
                              to={href}
                              onClick={() => setOpen(false)}
                              className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                isItemActive(item) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                              }`}
                            >
                              <Icon size={18} />
                              <span>{item.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Recherche globale: eleve, classe, paiement..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </form>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Button variant="ghost" className="px-3" onClick={() => setNotificationsOpen((value) => !value)}><Bell size={18} /></Button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                    <p className="px-2 pb-2 text-sm font-bold">Notifications</p>
                    {['Paiements en attente', 'Conseil de classe vendredi', '3 absences a justifier'].map((item) => (
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
                    <p className="mt-1 text-xs text-slate-500">{user?.role || 'Administrateur'}</p>
                  </div>
                  <ChevronDown size={16} className="hidden text-slate-400 sm:block" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    <button className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => navigate('/app/settings')}>Profil et parametres</button>
                    <button className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => navigate('/app/users')}>Utilisateurs</button>
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
