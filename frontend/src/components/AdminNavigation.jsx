import { useAuth } from '../context/AuthContext';

const NAV_SECTIONS = [
  {
    title: "Vue d'ensemble",
    items: [
      { id: 'accueil', icon: 'fa-home', label: 'Accueil' },
    ],
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
  const { user } = useAuth();

  const handleTabClick = (tab) => {
    if (tab.disabled) return;
    onTabChange(tab.id);
  };

  return (
    <nav className="mt-2">
      <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
        {NAV_SECTIONS.flatMap((section) => [
          <li key={`header-${section.title}`} className="nav-header">{section.title}</li>,
          ...section.items.map((tab) => (
            <li key={tab.id} className="nav-item">
              <button
                type="button"
                className={`nav-link text-left w-100 border-0 bg-transparent ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled opacity-50' : ''}`}
                onClick={() => handleTabClick(tab)}
                disabled={tab.disabled}
              >
                <i className={`nav-icon fas ${tab.icon}`} />
                <p className="d-inline">
                  {tab.label}
                  {tab.badge && <span className="badge badge-info right">{tab.badge}</span>}
                  {tab.disabled && <span className="badge badge-secondary right">Bientôt</span>}
                </p>
              </button>
            </li>
          )),
        ])}
      </ul>
      <div className="mt-3 px-3 text-white-50 small">
        <i className="fas fa-user-shield mr-1" />
        {user?.first_name} {user?.last_name}
      </div>
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
