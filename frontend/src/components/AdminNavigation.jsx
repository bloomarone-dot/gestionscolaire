import { useAuth } from '../context/AuthContext';

const NAV_SECTIONS = [
  {
    title: "Vue d'ensemble",
    items: [{ id: 'accueil', icon: 'fa-home', label: 'Accueil' }],
  },
  {
    title: 'Gestion',
    items: [
      { id: 'professeurs', icon: 'fa-chalkboard-teacher', label: 'Professeurs' },
      { id: 'classes', icon: 'fa-book', label: 'Classes' },
      { id: 'matieres', icon: 'fa-book-open', label: 'Matières' },
      { id: 'eleves', icon: 'fa-users', label: 'Élèves' },
    ],
  },
  {
    title: 'Notes & évaluations',
    items: [
      { id: 'saisie-notes', icon: 'fa-edit', label: 'Saisie Notes' },
      { id: 'fenetre-notes', icon: 'fa-clock', label: 'Délais de saisie' },
      { id: 'bulletins', icon: 'fa-file-alt', label: 'Bulletins' },
      { id: 'bulletin-config', icon: 'fa-cog', label: 'Config. bulletins', badge: 'Nouveau' },
    ],
  },
  {
    title: 'À venir',
    items: [
      { id: 'emploi-temps', icon: 'fa-calendar-alt', label: 'Emploi du Temps', disabled: true },
      { id: 'rapports', icon: 'fa-chart-bar', label: 'Rapports', disabled: true },
    ],
  },
];

export default function AdminNavigation({ activeTab, onTabChange }) {
  const handleTabClick = (e, tab) => {
    e.preventDefault();
    if (tab.disabled) return;
    onTabChange(tab.id);
  };

  return (
    <nav className="sidebar-nav-menu">
      <ul className="nav nav-pills nav-sidebar flex-column" role="menu">
        {NAV_SECTIONS.flatMap((section) => [
          <li key={`header-${section.title}`} className="nav-header">{section.title}</li>,
          ...section.items.map((tab) => (
            <li key={tab.id} className="nav-item">
              <a
                href="#"
                className={`nav-link ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
                onClick={(e) => handleTabClick(e, tab)}
                aria-disabled={tab.disabled || undefined}
              >
                <i className={`nav-icon fas ${tab.icon}`} />
                <p>
                  {tab.label}
                  {tab.badge && <span className="badge badge-info right">{tab.badge}</span>}
                  {tab.disabled && <span className="badge badge-secondary right">Bientôt</span>}
                </p>
              </a>
            </li>
          )),
        ])}
      </ul>
    </nav>
  );
}

export const ADMIN_PAGE_TITLES = {
  accueil: 'Tableau de bord',
  professeurs: 'Professeurs',
  classes: 'Classes',
  matieres: 'Matières',
  eleves: 'Élèves',
  'saisie-notes': 'Saisie des notes',
  'fenetre-notes': 'Délais de saisie',
  bulletins: 'Bulletins',
  'bulletin-config': 'Configuration des bulletins',
};

export const ADMIN_PAGE_SUBTITLES = {
  accueil: 'Pilotage de votre établissement',
  professeurs: 'Comptes et attributions',
  classes: 'Sections francophone et anglophone',
  matieres: 'Groupes et coefficients',
  eleves: 'Inscriptions et effectifs',
  'saisie-notes': 'Consultation et correction des notes',
  'fenetre-notes': 'Périodes autorisées pour les professeurs',
  bulletins: 'Génération PDF officielle',
  'bulletin-config': 'Logo, en-têtes et modèle Cameroun',
};
