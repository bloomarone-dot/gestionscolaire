import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { APP_NAME } from '../utils/brand';

const LINKS = [
  { href: '#features', label: 'Fonctionnalités' },
  { href: '#about', label: 'À propos' },
  { href: '#contact', label: 'Contact' },
];

export default function Navbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#101F3C] text-white">
            <GraduationCap size={18} />
          </span>
          <span className="text-base font-extrabold tracking-tight text-slate-900">{APP_NAME}</span>
        </Link>

        {/* Nav Links */}
        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link
          to={isAuthenticated ? '/dashboard' : '/login'}
          className="inline-flex items-center justify-center rounded-xl bg-[#101F3C] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0B1730] active:scale-[0.98]"
        >
          {isAuthenticated ? 'Tableau de bord' : 'Se connecter'}
        </Link>
      </nav>
    </header>
  );
}
