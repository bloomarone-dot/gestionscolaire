import { useAuth } from '../context/AuthContext';
import SchoolSelector from './SchoolSelector';
import '../styles/superadmin-layout.css';

export default function SuperAdminHeader() {
  const { user, selectedSchool } = useAuth();

  return (
    <header className="sa-topbar">
      <div className="sa-topbar-left">
        <SchoolSelector />
        {selectedSchool && (
          <span className="sa-context-badge">
            Contexte actif : <strong>{selectedSchool.name}</strong>
          </span>
        )}
      </div>
      <div className="sa-topbar-right">
        <span className="sa-topbar-user">
          {user?.first_name} {user?.last_name}
        </span>
      </div>
    </header>
  );
}
