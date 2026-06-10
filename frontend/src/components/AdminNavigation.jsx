import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/admin-navigation.css';

const NAV_SECTIONS = [
  {
    title: "Vue d'ensemble",
    items: [
      { id: 'accueil', icon: '🏠', label: 'Accueil' },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { id: 'professeurs', icon: '👨‍🏫', label: 'Professeurs' },
      { id: 'classes', icon: '📚', label: 'Classes' },
      { id: 'matieres', icon: '📖', label: 'Matières' },
      { id: 'eleves', icon: '👥', label: 'Élèves' },
    ],
  },
  {
    title: 'Notes & évaluations',
    items: [
      { id: 'saisie-notes', icon: '📝', label: 'Saisie Notes' },
      { id: 'fenetre-notes', icon: '⏰', label: 'Délais de saisie' },
      { id: 'bulletins', icon: '📄', label: 'Bulletins' },
      { id: 'bulletin-config', icon: '⚙️', label: 'Config. bulletins', badge: 'Nouveau' },
    ],
  },
  {
    title: 'À venir',
    items: [
      { id: 'emploi-temps', icon: '🗓️', label: 'Emploi du Temps', disabled: true },
      { id: 'rapports', icon: '📊', label: 'Rapports', disabled: true },
    ],
  },
];

export default function AdminNavigation({ activeTab, onTabChange, schoolName, schoolLogo }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const handleTabClick = (tab) => {
    if (tab.disabled) return;
    onTabChange(tab.id);
    setIsOpen(false);
  };

  return (
    <nav className="admin-navigation">
      <div className="admin-nav-header">
        {schoolLogo ? (
          <img src={schoolLogo} alt="" className="school-logo-thumb" />
        ) : (
          <span className="admin-nav-brand-icon">🏛️</span>
        )}
        <div className="admin-nav-brand-text">
          <span className="admin-nav-title">Admin Panel</span>
          {schoolName && <span className="admin-nav-subtitle">{schoolName}</span>}
        </div>
        <button type="button" className="admin-nav-toggle" onClick={() => setIsOpen(!isOpen)}>
          ☰
        </button>
      </div>

      <div className={`admin-nav-body ${isOpen ? 'open' : ''}`}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="admin-nav-section">
            <div className="admin-nav-section-title">{section.title}</div>
            <ul className="admin-nav-menu">
              {section.items.map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    className={`admin-nav-link ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
                    onClick={() => handleTabClick(tab)}
                    disabled={tab.disabled}
                  >
                    <span className="admin-nav-link-icon">{tab.icon}</span>
                    <span className="admin-nav-label">{tab.label}</span>
                    {tab.badge && <span className="admin-nav-badge admin-nav-badge-new">{tab.badge}</span>}
                    {tab.disabled && <span className="admin-nav-badge">Bientôt</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="admin-sidebar-footer">
        <div className="admin-user-card">
          <div className="admin-user-avatar">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="admin-user-info">
            <div className="admin-user-name">{user?.first_name} {user?.last_name}</div>
            <div className="admin-user-role">Administrateur</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
