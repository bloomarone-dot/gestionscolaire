import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useAdminLTE from '../hooks/useAdminLTE';

export default function AdminLTELayout({
  brandTitle = 'EduSaaS',
  brandSubtitle = '',
  brandLogo = null,
  brandIcon = 'fa-graduation-cap',
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
      <nav className="main-header navbar navbar-expand navbar-white navbar-light border-bottom-0">
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link" data-widget="pushmenu" href="#" role="button" onClick={(e) => e.preventDefault()}>
              <i className="fas fa-bars" />
            </a>
          </li>
          {pageTitle && (
            <li className="nav-item d-none d-sm-inline-block">
              <span className="nav-link font-weight-bold text-dark">{pageTitle}</span>
            </li>
          )}
        </ul>

        {navbarExtra && (
          <ul className="navbar-nav mx-auto flex-grow-1 justify-content-center">
            <li className="nav-item">{navbarExtra}</li>
          </ul>
        )}

        <ul className="navbar-nav ml-auto">
          <li className="nav-item dropdown">
            <a className="nav-link dropdown-toggle" href="#" role="button" data-toggle="dropdown" onClick={(e) => e.preventDefault()}>
              <span className="d-none d-md-inline mr-1">{fullName}</span>
              <span className="badge badge-primary badge-pill">{initials}</span>
            </a>
            <div className="dropdown-menu dropdown-menu-right">
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

      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <a href="/" className="brand-link text-center">
          {brandLogo ? (
            <img src={brandLogo} alt="" className="brand-image elevation-3" style={{ opacity: 0.95 }} />
          ) : (
            <span className="brand-image elevation-3 d-inline-flex align-items-center justify-content-center bg-white text-primary" style={{ width: 33, height: 33, borderRadius: 4 }}>
              <i className={`fas ${brandIcon}`} />
            </span>
          )}
          <span className="brand-text font-weight-light ml-2">{brandTitle}</span>
          {brandSubtitle && (
            <small className="d-block brand-text font-weight-light text-white-50" style={{ fontSize: '0.7rem' }}>
              {brandSubtitle}
            </small>
          )}
        </a>

        <div className="sidebar">
          <div className="user-panel mt-3 pb-3 mb-3 d-flex">
            <div className="image">
              <span className="img-circle elevation-2 bg-light text-primary d-inline-flex align-items-center justify-content-center" style={{ width: 34, height: 34, fontSize: '0.75rem', fontWeight: 700 }}>
                {initials}
              </span>
            </div>
            <div className="info">
              <a href="#" className="d-block text-white" onClick={(e) => e.preventDefault()}>{fullName}</a>
            </div>
          </div>

          {sidebar}
        </div>
      </aside>

      <div className="content-wrapper">
        {(pageTitle || breadcrumb) && (
          <div className="content-header">
            <div className="container-fluid">
              <div className="row mb-2">
                <div className="col-sm-6">
                  {pageTitle && <h1 className="m-0">{pageTitle}</h1>}
                  {pageSubtitle && <p className="text-muted mb-0 mt-1">{pageSubtitle}</p>}
                </div>
                {breadcrumb && (
                  <div className="col-sm-6">
                    <ol className="breadcrumb float-sm-right">{breadcrumb}</ol>
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
        <div className="float-right d-none d-sm-inline-block">
          <b>Version</b> 1.0
        </div>
      </footer>
    </div>
  );
}
