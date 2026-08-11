// Ordre hiérarchique STRICT du cahier des charges (§8). Les rubriques non encore
// implémentées sont marquées `disabled` (placeholder « Bientôt »).
const NAV_SECTIONS = [
  {
    title: null,
    items: [{ id: 'accueil', icon: 'fa-tachometer-alt', label: 'Tableau de bord' }],
  },
  {
    title: 'Structure Pédagogique',
    items: [
      { id: 'classes', icon: 'fa-chalkboard', label: 'Classes' },
      { id: 'matieres', icon: 'fa-book-open', label: 'Matières' },
      { id: 'referentiel', icon: 'fa-landmark', label: 'Référentiel MINESEC', disabled: true },
    ],
  },
  {
    title: 'Personnel',
    items: [
      { id: 'professeurs', icon: 'fa-chalkboard-teacher', label: 'Enseignants' },
      { id: 'direction', icon: 'fa-user-tie', label: 'Direction / Administration', disabled: true },
    ],
  },
  {
    title: 'Élèves',
    items: [
      { id: 'eleves', icon: 'fa-users', label: 'Liste des élèves' },
      { id: 'inscriptions', icon: 'fa-user-plus', label: 'Inscriptions', disabled: true },
      { id: 'promotions', icon: 'fa-level-up-alt', label: 'Promotions / Passages', disabled: true },
    ],
  },
  {
    title: 'Évaluations',
    items: [
      { id: 'saisie-notes', icon: 'fa-edit', label: 'Saisie des notes' },
      { id: 'fenetre-notes', icon: 'fa-clock', label: 'Délais de saisie' },
      { id: 'bulletins', icon: 'fa-file-alt', label: 'Bulletins' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { id: 'annonces', icon: 'fa-bullhorn', label: 'Annonces', disabled: true },
      { id: 'notifications', icon: 'fa-bell', label: 'Notifications', disabled: true },
    ],
  },
  {
    title: 'Paramètres',
    items: [
      { id: 'profil-ecole', icon: 'fa-school', label: "Profil de l'école", disabled: true },
      { id: 'bulletin-config', icon: 'fa-cog', label: 'Config. bulletins' },
      { id: 'utilisateurs', icon: 'fa-user-shield', label: 'Utilisateurs & Droits', disabled: true },
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
          section.title
            ? <li key={`header-${section.title}`} className="nav-header">{section.title}</li>
            : null,
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
