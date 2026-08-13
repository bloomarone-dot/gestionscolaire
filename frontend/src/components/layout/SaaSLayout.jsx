import { useEffect, useState, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, ChevronDown, ChevronLeft, GraduationCap, Menu, Search, X, LogOut,
  Maximize2, Minimize2, UserRound, Languages,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import { APP_NAME } from '../../utils/brand';
import { buildAdminNav, flattenNav, NAV_ICONS } from '../../utils/navConfig';
import BrandMark from '../BrandMark';
import ThemeToggleFloating from '../ThemeToggleFloating';
import { Avatar, Button } from '../ui';

const LANGUAGES = [
  ['fr', 'FR'],
  ['en', 'EN'],
];

function resolveIcon(key) {
  return NAV_ICONS[key] || GraduationCap;
}

export default function SaaSLayout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { user, logout } = useAuth();
  const { lang, toggleLang, t } = useLanguage();
  const { labels: ui, kind, schoolName } = useEstablishmentProfile();
  const nav = useMemo(() => buildAdminNav(ui, kind), [ui, kind]);
  const flatNav = useMemo(() => flattenNav(nav).map((item) => ({
    ...item,
    icon: resolveIcon(item.icon),
  })), [nav]);
  const navigate = useNavigate();
  const location = useLocation();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Admin École';

  useEffect(() => {
    document.title = schoolName ? `${schoolName} — ${APP_NAME}` : APP_NAME;
  }, [schoolName]);

  // Plein écran — suit l'état réel du navigateur (touche Echap incluse).
  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

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

  function renderNavItem(item) {
    const Icon = resolveIcon(item.icon);
    const href = item.match?.fonction === 'direction' ? `${item.to}?fonction=direction` : item.to;
    return (
      <NavLink
        key={`${item.to}-${item.label}`}
        to={href}
        title={item.label}
        onClick={() => setOpen(false)}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${collapsed ? 'justify-center' : ''} ${
          isItemActive(item) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
        }`}
      >
        <Icon size={20} />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {open && <button className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setOpen(false)} aria-label="Fermer le menu" />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${collapsed ? 'lg:w-20' : 'lg:w-72'} ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} w-72`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <BrandMark schoolName={schoolName} kind={kind} collapsed={collapsed} />
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((entry) => (
            entry.group ? (
              <div key={entry.group} className="pt-4 first:pt-0">
                {!collapsed && (
                  <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {entry.group}
                  </p>
                )}
                <div className="space-y-1">
                  {entry.items.map((item) => renderNavItem(item))}
                </div>
              </div>
            ) : renderNavItem(entry)
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <button className="hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 lg:flex" onClick={() => setCollapsed((v) => !v)}>
            <ChevronLeft className={`transition ${collapsed ? 'rotate-180' : ''}`} size={18} />
            {!collapsed && t('collapse')}
          </button>
          <button className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50" onClick={handleLogout}>
            <LogOut size={18} />
            {!collapsed && t('logout')}
          </button>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}><Menu size={22} /></button>
            {schoolName && (
              <div className="min-w-0 flex-1 lg:hidden">
                <p className="truncate text-sm font-extrabold text-slate-900">{schoolName}</p>
                <p className="truncate text-xs text-slate-500">{ui.appTagline}</p>
              </div>
            )}
            <form className="hidden max-w-xl flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex" onSubmit={handleSearch}>
              <Search size={18} className="text-slate-400" />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder={t('searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
            </form>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              {/* Langue — visible sur toutes les tailles d'écran, y compris mobile */}
              <button
                type="button"
                title={lang === 'fr' ? t('switchToEn') : t('switchToFr')}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={toggleLang}
              >
                <Languages size={18} />
                <span className="hidden sm:inline">{LANGUAGES.find(([code]) => code === lang)?.[1] || 'FR'}</span>
              </button>

              {/* Plein écran — reste réservé au desktop, peu de sens sur mobile */}
              <button
                type="button"
                title={isFullscreen ? t('fullscreenExit') : t('fullscreenEnter')}
                className="hidden rounded-lg p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:inline-flex"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>

              <div className="relative">
                <Button variant="ghost" className="px-3" onClick={() => setNotificationsOpen((value) => !value)}><Bell size={18} /></Button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                    <p className="px-2 pb-2 text-sm font-bold">{t('notifications')}</p>
                    {[t('notif1'), t('notif2'), t('notif3')].map((item) => (
                      <button key={item} className="block w-full rounded-lg px-2 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">{item}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:bg-slate-50" onClick={() => setUserMenuOpen((value) => !value)}>
                  <Avatar name={name} />
                  <div className="hidden sm:block">
                    <p className="text-sm font-bold leading-none">{name}</p>
                    <p className="mt-1 max-w-[12rem] truncate text-xs text-slate-500">
                      {schoolName || user?.role || t('administrator')}
                    </p>
                  </div>
                  <ChevronDown size={16} className="hidden text-slate-400 sm:block" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                      <Avatar name={name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{name}</p>
                        <p className="truncate text-xs text-slate-500">{schoolName || user?.role || t('administrator')}</p>
                      </div>
                    </div>

                    <div className="my-1.5 h-px bg-slate-100" />

                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => { setUserMenuOpen(false); navigate('/app/profile'); }}
                    >
                      <UserRound size={16} /> {t('myProfile')}
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => { setUserMenuOpen(false); navigate('/app/settings'); }}
                    >
                      {t('establishmentSettings')}
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => { setUserMenuOpen(false); navigate('/app/users'); }}
                    >
                      {t('users')}
                    </button>

                    <div className="my-1.5 h-px bg-slate-100" />

                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} /> {t('logout')}
                    </button>
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

      {/* Thème — bouton flottant façon WhatsApp, visible partout, mobile inclus */}
      <ThemeToggleFloating />
    </div>
  );
}