import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/dashboard-shared.css';

export default function DashboardUserBar({ contextLabel, roleLabel }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || '?';
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Utilisateur';

  return (
    <header className="dashboard-user-bar">
      <div className="dashboard-user-bar-left">
        {contextLabel && (
          <span className="dashboard-context-badge">{contextLabel}</span>
        )}
      </div>
      <div className="dashboard-user-bar-right">
        <div className="dashboard-user-chip">
          <div className="dashboard-user-avatar">{initials}</div>
          <div className="dashboard-user-text">
            <span className="dashboard-user-name">{fullName}</span>
            {roleLabel && <span className="dashboard-user-role">{roleLabel}</span>}
          </div>
        </div>
        <button type="button" className="dashboard-logout-btn" onClick={handleLogout}>
          Déconnexion
        </button>
      </div>
    </header>
  );
}
