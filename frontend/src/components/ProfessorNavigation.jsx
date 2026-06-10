import { useState } from 'react';
import '../styles/professor-navigation.css';

export default function ProfessorNavigation({ activeTab, onTabChange }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const tabs = [
    { id: 'accueil', label: 'Accueil', icon: '🏠' },
    { id: 'mes-classes', label: 'Mes classes', icon: '📚' },
    { id: 'notes', label: 'Saisie notes', icon: '📝' },
    { id: 'bulletins', label: 'Bulletins', icon: '📄' },
    { id: 'parametres', label: 'Paramètres', icon: '⚙️' }
  ];

  return (
    <nav className="professor-navigation">
      <div className="prof-nav-header">
        <div className="prof-nav-icon">👨‍🏫</div>
        <div className="prof-nav-title">Professeur</div>
        <button className="nav-toggle" onClick={() => setDropdownOpen(!dropdownOpen)}>
          ☰
        </button>
      </div>

      <ul className={`prof-nav-menu ${dropdownOpen ? 'open' : ''}`}>
        {tabs.map(tab => (
          <li key={tab.id}>
            <button
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
    </nav>
  );
}
