import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/superadmin/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard', end: true },
  { to: '/superadmin/schools', icon: 'fa-building', label: 'Établissements' },
  { to: '/superadmin/admins', icon: 'fa-user-shield', label: 'Administrateurs' },
  { to: '/superadmin/logs', icon: 'fa-list-alt', label: 'Logs & Activité' },
  { to: '/superadmin/settings', icon: 'fa-cog', label: 'Paramètres' },
];

export default function SuperAdminNavigation() {
  return (
    <nav className="sidebar-nav-menu">
      <ul className="nav nav-pills nav-sidebar flex-column" role="menu">
        <li className="nav-header">Plateforme</li>
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="nav-item">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <i className={`nav-icon fas ${item.icon}`} />
              <p>{item.label}</p>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export const SUPERADMIN_PAGE_TITLES = {
  '/superadmin/dashboard': 'Tableau de bord',
  '/superadmin/schools': 'Établissements',
  '/superadmin/admins': 'Administrateurs',
  '/superadmin/logs': 'Logs & activité',
  '/superadmin/settings': 'Paramètres',
};

export const SUPERADMIN_PAGE_SUBTITLES = {
  '/superadmin/dashboard': "Vue d'ensemble de la plateforme EduSaaS",
  '/superadmin/schools': 'Créer, consulter et gérer les établissements',
  '/superadmin/admins': 'Comptes administrateurs et réinitialisation',
  '/superadmin/logs': 'Historique des actions sur la plateforme',
  '/superadmin/settings': 'Configuration globale du système',
};
