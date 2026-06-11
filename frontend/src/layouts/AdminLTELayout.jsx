import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useAdminLTE from '../hooks/useAdminLTE';
import '../styles/dashboard-shell.css';

export default function AdminLTELayout({
  brandTitle = 'EduSaaS',
  brandSubtitle = '',
  brandLogo = null,
  brandIcon = 'fa-graduation-cap',
  roleLabel = '',
  sidebar,
  pageTitle,
  pageSubtitle,
  breadcrumb,
  navbarExtra = null,
  adminlteKey = '',
  children,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useAdminLTE([adminlteKey, pageTitle]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ')
    || user?.username
    || 'Utilisateur';
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || '?';

  return (
    <div className="wrapper">
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link" data-widget="pushmenu" href="#" role="button" onClick={(e) => e.preventDefault()}>
              <i className="fas fa-bars" />
            </a>
          </li>
        </ul>

        {navbarExtra && (
          <div className="navbar-nav flex-grow-1 justify-content-center px-2">
            {navbarExtra}
          </div>
        )}

        <ul className="navbar-nav ml-auto align-items-center">
          {roleLabel && (
            <li className="nav-item d-none d-md-block mr-2">
              <span className="badge badge-light border" style={{ color: '#6d28d9', borderColor: '#ddd6fe' }}>
                {roleLabel}
              </span>
            </li>
          )}
          <li className="nav-item dropdown">
            <a className="nav-link dropdown-toggle d-flex align-items-center" href="#" data-toggle="dropdown" onClick={(e) => e.preventDefault()}>
              <span className="user-avatar mr-2 d-inline-flex">{initials}</span>
              <span className="d-none d-md-inline font-weight-bold">{fullName}</span>
            </a>
            <div className="dropdown-menu dropdown-menu-right shadow-sm">
              <span className="dropdown-item-text text-muted small">{user?.username}</span>
              <div className="dropdown-divider" />
              <button type="button" className="dropdown-item text-danger" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt mr-2" />
                Déconnexion
              </button>
            </div>
          </li>
        </ul>
      </nav>

      <aside className="main-sidebar sidebar-edusaas elevation-4">
        <a href="/" className="brand-link" onClick={(e) => e.preventDefault()}>
          {brandLogo ? (
            <img src={brandLogo} alt="" className="brand-image" />
          ) : (
            <span className="brand-icon-wrap">
              <i className={`fas ${brandIcon}`} />
            </span>
          )}
          <span className="brand-text">
            {brandTitle}
            {brandSubtitle && <span className="brand-subtitle">{brandSubtitle}</span>}
          </span>
        </a>

        <div className="sidebar">
          <div className="user-panel mt-2 pb-2 mb-2 d-flex">
            <div className="image">
              <span className="user-avatar">{initials}</span>
            </div>
            <div className="info">
              <a href="#" className="d-block" onClick={(e) => e.preventDefault()}>{fullName}</a>
              {roleLabel && <small>{roleLabel}</small>}
            </div>
          </div>

          {sidebar}
        </div>
      </aside>

      <div className="content-wrapper">
        {pageTitle && (
          <div className="content-header">
            <div className="container-fluid">
              <div className="row align-items-center mb-1">
                <div className="col-sm-8">
                  <h1 className="m-0">{pageTitle}</h1>
                  {pageSubtitle && <p className="text-muted mb-0 mt-1">{pageSubtitle}</p>}
                </div>
                {breadcrumb && (
                  <div className="col-sm-4">
                    <ol className="breadcrumb float-sm-right mb-0">{breadcrumb}</ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <section className="content">
          <div className="container-fluid">{children}</div>
        </section>
      </div>

      <footer className="main-footer">
        <strong>EduSaaS</strong> — Gestion Scolaire
        <span className="float-right d-none d-sm-inline-block text-muted">v1.0</span>
      </footer>
    </div>
  );
}
