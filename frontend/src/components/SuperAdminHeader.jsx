import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import SchoolSelector from './SchoolSelector';
import { useAuth } from '../context/useAuth';

export default function SuperAdminHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Super Admin';
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 flex-1 items-center">
        <SchoolSelector />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#101F3C] text-xs font-bold text-white">
            {initials}
          </span>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-bold leading-none text-slate-900">{name}</p>
            <p className="mt-1 text-xs text-slate-500">Super administrateur</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
