import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/superadmin-layout.css';

const NAV_ITEMS = [
  { to: '/superadmin/dashboard', icon: '🏠', label: 'Dashboard', end: true },
  { to: '/superadmin/schools', icon: '🏛️', label: 'Établissements' },
  { to: '/superadmin/admins', icon: '👤', label: 'Administrateurs' },
  { to: '/superadmin/logs', icon: '📋', label: 'Logs & Activité' },
  { to: '/superadmin/settings', icon: '⚙️', label: 'Paramètres' },
];

export default function SuperAdminNavigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sa-sidebar">
      <div className="sa-sidebar-brand">
        <span className="sa-brand-icon">🎓</span>
        <div>
          <div className="sa-brand-title">EduSaaS</div>
          <div className="sa-brand-sub">Super Admin</div>
        </div>
      </div>

      <nav className="sa-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sa-nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="sa-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sa-sidebar-footer">
        <div className="sa-user-card">
          <div className="sa-user-avatar">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="sa-user-info">
            <div className="sa-user-name">{user?.first_name} {user?.last_name}</div>
            <div className="sa-user-role">Super Administrateur</div>
          </div>
        </div>
        <button type="button" className="sa-logout-btn" onClick={handleLogout}>
          🚪 Déconnexion
        </button>
      </div>
    </aside>
  );
}
