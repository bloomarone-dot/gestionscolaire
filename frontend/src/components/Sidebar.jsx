import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { APP_NAME } from '../utils/brand';

const NAV_ITEMS = [
  { to: '/',        icon: '📊', label: 'Tableau de bord' },
  { to: '/eleves',  icon: '👨‍🎓', label: 'Élèves' },
  { to: '/notes',   icon: '📝', label: 'Notes' },
  { to: '/bulletin',icon: '📋', label: 'Bulletins' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'US';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🎓</div>
        <div>
          <div className="sidebar-logo-text">{APP_NAME}</div>
          <div className="sidebar-logo-sub">Gestion scolaire</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <span className="nav-section-label">Menu principal</span>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span className="nav-link-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer utilisateur */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{user?.username}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          <span>🚪</span> Déconnexion
        </button>
      </div>
    </aside>
  );
}
