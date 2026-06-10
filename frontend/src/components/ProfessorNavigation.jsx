import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/professor-navigation.css';

export default function ProfessorNavigation({ activeTab, onTabChange, schoolName, schoolLogo }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const tabs = [
    { id: 'accueil', label: 'Accueil', icon: '🏠' },
    { id: 'mes-classes', label: 'Mes classes', icon: '📚' },
    { id: 'notes', label: 'Saisie notes', icon: '📝' },
    { id: 'bulletins', label: 'Bulletins', icon: '📄' },
    { id: 'parametres', label: 'Paramètres', icon: '⚙️' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="professor-navigation">
      <div className="prof-nav-header">
        {schoolLogo ? (
          <img src={schoolLogo} alt="" className="school-logo-thumb" />
        ) : (
          <div className="prof-nav-icon">👨‍🏫</div>
        )}
        <div className="prof-nav-brand-text">
          <div className="prof-nav-title">Espace professeur</div>
          {schoolName && <div className="prof-nav-subtitle">{schoolName}</div>}
        </div>
        <button type="button" className="nav-toggle" onClick={() => setDropdownOpen(!dropdownOpen)}>
          ☰
        </button>
      </div>

      <ul className={`prof-nav-menu ${dropdownOpen ? 'open' : ''}`}>
        {tabs.map((tab) => (
          <li key={tab.id}>
            <button
              type="button"
              className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                onTabChange(tab.id);
                setDropdownOpen(false);
              }}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="prof-sidebar-footer">
        <div className="prof-user-card">
          <div className="prof-user-avatar">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="prof-user-info">
            <div className="prof-user-name">{user?.first_name} {user?.last_name}</div>
            <div className="prof-user-role">Professeur</div>
          </div>
        </div>
        <button type="button" className="prof-logout-btn" onClick={handleLogout}>
          Déconnexion
        </button>
      </div>
    </nav>
  );
}
