import { useEffect, useState, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, CalendarDays, ChevronDown, ChevronLeft, ClipboardList, GraduationCap,
  Menu, Search, WalletCards, X, LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import { APP_NAME } from '../../utils/brand';
import { buildAdminNav, flattenNav, roleLabel, NAV_ICONS } from '../../utils/navConfig';
import BrandMark from '../BrandMark';
import { Avatar, Button } from '../ui';

/**
 * Design tokens — "Ardoise & sceau doré"
 * ink       #16302C  chalkboard — headings, group icons, active accents
 * ink-soft  #5B6A66  secondary text
 * gold      #C9962E  seal — active state, focus rings, notification dot
 * gold-100  #F6E9CC  active nav background tint
 * paper     #FAF8F3  page background (warm, not clinical slate)
 * line      #E7E2D6  warm hairline borders
 * coral     #C0553E  destructive / logout
 *
 * Fonts: this file assumes "Fraunces" (display) and "Work Sans" (body) are
 * loaded, e.g. in index.html:
 * <link rel="preconnect" href="https://fonts.googleapis.com">
 * <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
 * If they aren't loaded, the arbitrary-value classes fall back to the
 * browser's generic serif/sans-serif — layout still works either way.
 */

const NOTIFICATIONS = [
  { icon: WalletCards, text: 'Paiements en attente', time: 'Il y a 20 min' },
  { icon: CalendarDays, text: 'Conseil de classe vendredi', time: 'Il y a 2 h' },
  { icon: ClipboardList, text: '3 absences a justifier', time: 'Hier' },
];

export default function SaaSLayout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { user, logout } = useAuth();
  const { labels: ui, kind, schoolName } = useEstablishmentProfile();
  const nav = useMemo(() => buildAdminNav(ui, kind), [ui, kind]);
  const flatNav = useMemo(() => flattenNav(nav).map((item) => ({
    ...item,
    icon: NAV_ICONS[item.icon] || GraduationCap,
  })), [nav]);
  const navigate = useNavigate();
  const location = useLocation();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Admin Ecole';

  useEffect(() => {
    document.title = schoolName ? `${schoolName} — ${APP_NAME}` : APP_NAME;
  }, [schoolName]);

  const isItemActive = (item) => {
    if (location.pathname !== item.to.split('?')[0]) return false;
    if (!item.match) return true;
    const params = new URLSearchParams(location.search);
    if (item.match.fonction === 'enseignant') return params.get('fonction') !== 'direction';
    if (item.match.fonction === 'direction') return params.get('fonction') === 'direction';
    return true;
  };

  const currentLabel = flatNav.find(isItemActive)?.label || 'Tableau de bord';

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
      setQuery('');
    }
  };

  const renderNavLink = (item, key) => {
    const Icon = NAV_ICONS[item.icon] || GraduationCap;
    const href = item.match?.fonction === 'direction' ? `${item.to}?fonction=direction` : item.to;
    const active = isItemActive(item);
    return (
      <NavLink
        key={key}
        to={href}
        title={item.label}
        onClick={() => setOpen(false)}
        className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors motion-reduce:transition-none lg:py-2.5 ${
          collapsed ? 'justify-center' : ''
        } ${
          active
            ? 'bg-[#F6E9CC]/70 text-[#16302C] shadow-[inset_3px_0_0_0_#C9962E]'
            : 'text-[#4B5754] hover:bg-[#FAF8F3] hover:text-[#16302C]'
        }`}
      >
        <Icon size={19} strokeWidth={active ? 2.4 : 2} />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] font-['Work_Sans',sans-serif] text-[#1C2624]">
      {/* signature accent bar */}
      <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-gradient-to-r from-[#16302C] via-[#C9962E] to-[#16302C]" />

      {open && (
        <button
          className="fixed inset-0 z-30 bg-[#16302C]/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 mt-[3px] flex flex-col border-r border-[#E7E2D6] bg-white transition-all duration-300 ease-out motion-reduce:transition-none ${
          collapsed ? 'lg:w-20' : 'lg:w-72'
        } ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'} w-[86%] max-w-72`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#E7E2D6] px-4">
          <BrandMark schoolName={schoolName} kind={kind} collapsed={collapsed} />
          <button
            className="rounded-lg p-2 text-[#5B6A66] hover:bg-[#FAF8F3] lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {nav.map((entry) => {
            if (!entry.items) {
              return renderNavLink(entry, entry.to);
            }
            return (
              <div key={entry.group}>
                {!collapsed && (
                  <p className="mb-1.5 px-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#8A9490]">
                    {entry.group}
                  </p>
                )}
                <div className="space-y-1">
                  {entry.items.map((item) => renderNavLink(item, `${item.to}-${item.label}`))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-[#E7E2D6] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            className="hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#5B6A66] hover:bg-[#FAF8F3] lg:flex"
            onClick={() => setCollapsed((v) => !v)}
          >
            <ChevronLeft className={`transition-transform motion-reduce:transition-none ${collapsed ? 'rotate-180' : ''}`} size={18} />
            {!collapsed && 'Réduire'}
          </button>
          <button
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#C0553E] hover:bg-[#C0553E]/10 lg:py-2.5"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            {!collapsed && 'Déconnexion'}
          </button>
        </div>
      </aside>

      <div className={`pt-[3px] transition-all duration-300 motion-reduce:transition-none ${collapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <header className="sticky top-[3px] z-20 border-b border-[#E7E2D6] bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              className="rounded-lg p-2 text-[#4B5754] hover:bg-[#FAF8F3] lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={22} />
            </button>
            {schoolName && (
              <div className="min-w-0 flex-1 lg:hidden">
                <p className="truncate text-sm font-bold text-[#16302C]">{schoolName}</p>
                <p className="truncate text-xs text-[#5B6A66]">{ui.appTagline}</p>
              </div>
            )}
            <form
              className="hidden max-w-xl flex-1 items-center gap-2 rounded-full border border-[#E7E2D6] bg-[#FAF8F3] px-4 py-2.5 transition-colors focus-within:border-[#C9962E] focus-within:ring-4 focus-within:ring-[#C9962E]/15 md:flex"
              onSubmit={handleSearch}
            >
              <Search size={17} className="text-[#8A9490]" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#8A9490]"
                placeholder="Rechercher : élève, classe, paiement..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </form>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Button
                  variant="ghost"
                  className="relative px-3"
                  onClick={() => setNotificationsOpen((value) => !value)}
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {NOTIFICATIONS.length > 0 && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#C9962E] ring-2 ring-white" />
                  )}
                </Button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-[#E7E2D6] bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-[#E7E2D6] px-4 py-3">
                      <p className="text-sm font-bold text-[#16302C]">Notifications</p>
                      <button className="text-xs font-semibold text-[#A97D22] hover:underline">Tout marquer lu</button>
                    </div>
                    <div className="max-h-72 overflow-y-auto p-2">
                      {NOTIFICATIONS.map((item) => (
                        <button
                          key={item.text}
                          className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[#FAF8F3]"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F6E9CC] text-[#16302C]">
                            <item.icon size={15} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[#1C2624]">{item.text}</span>
                            <span className="block text-xs text-[#8A9490]">{item.time}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    <button className="block w-full border-t border-[#E7E2D6] px-4 py-2.5 text-center text-xs font-semibold text-[#A97D22] hover:bg-[#FAF8F3]">
                      Voir toutes les notifications
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 text-left hover:border-[#E7E2D6] hover:bg-[#FAF8F3] sm:pr-3"
                  onClick={() => setUserMenuOpen((value) => !value)}
                >
                  <span className="rounded-full ring-2 ring-[#F6E9CC]">
                    <Avatar name={name} />
                  </span>
                  <div className="hidden sm:block">
                    <p className="text-sm font-bold leading-none text-[#1C2624]">{name}</p>
                    <p className="mt-1 max-w-[12rem] truncate text-xs text-[#5B6A66]">
                      {roleLabel(user?.role) || schoolName || 'Administrateur'}
                    </p>
                  </div>
                  <ChevronDown size={16} className="hidden text-[#8A9490] sm:block" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#E7E2D6] bg-white p-2 shadow-xl">
                    <button
                      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#374240] hover:bg-[#FAF8F3]"
                      onClick={() => navigate('/app/settings')}
                    >
                      Profil et paramètres
                    </button>
                    <button
                      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#374240] hover:bg-[#FAF8F3]"
                      onClick={() => navigate('/app/users')}
                    >
                      Utilisateurs
                    </button>
                    <div className="my-1 h-px bg-[#E7E2D6]" />
                    <button
                      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#C0553E] hover:bg-[#C0553E]/10"
                      onClick={handleLogout}
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="font-['Fraunces',serif] text-[26px] font-semibold leading-tight text-[#16302C] sm:text-[28px]">
              {currentLabel}
            </h1>
            {schoolName && <p className="mt-1 text-sm text-[#5B6A66]">{schoolName}</p>}
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}