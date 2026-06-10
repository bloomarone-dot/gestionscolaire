import { useAuth } from '../context/AuthContext';
import '../styles/admin-dashboard.css';

export default function AdminHeader({ schoolName }) {
  const { user } = useAuth();

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        {schoolName && (
          <span className="admin-context-badge">
            Établissement : <strong>{schoolName}</strong>
          </span>
        )}
      </div>
      <div className="admin-topbar-right">
        <span className="admin-topbar-user">
          {user?.first_name} {user?.last_name}
        </span>
      </div>
    </header>
  );
}
