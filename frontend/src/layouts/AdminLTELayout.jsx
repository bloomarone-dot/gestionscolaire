import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useAdminLTE, { toggleSidebar, closeMobileSidebar } from '../hooks/useAdminLTE';
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { handleContentClick } = useAdminLTE([adminlteKey, pageTitle]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ')
    || user?.username
    || 'Utilisateur';
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || '?';

  const onPushMenu = (e) => {
    e.preventDefault();
    toggleSidebar();
  };

  const onOverlayClick = () => {
    closeMobileSidebar();
    setUserMenuOpen(false);
  };

  const onContentClick = () => {
    handleContentClick();
    setUserMenuOpen(false);
  };

  return (
    <div className="wrapper edusaas-app">
      <div className="sidebar-overlay" onClick={onOverlayClick} aria-hidden="true" />

      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <button
              type="button"
              className="nav-link btn btn-link edusaas-pushmenu"
              onClick={onPushMenu}
              aria-label="Ouvrir ou fermer le menu"
            >
              <i className="fas fa-bars" />
            </button>
          </li>
          {pageTitle && (
            <li className="nav-item d-md-none">
              <span className="nav-link font-weight-bold text-truncate edusaas-mobile-title">
                {pageTitle}
              </span>
            </li>
          )}
        </ul>

        {navbarExtra && (
          <div className="navbar-nav flex-grow-1 justify-content-center px-2 edusaas-navbar-extra">
            {navbarExtra}
          </div>
        )}

        <ul className="navbar-nav ml-auto align-items-center">
          {roleLabel && (
            <li className="nav-item d-none d-md-block mr-2">
              <span className="badge edusaas-role-badge">{roleLabel}</span>
            </li>
          )}
          <li className={`nav-item dropdown ${userMenuOpen ? 'show' : ''}`}>
            <button
              type="button"
              className="nav-link btn btn-link dropdown-toggle d-flex align-items-center edusaas-user-btn"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-expanded={userMenuOpen}
            >
              <span className="user-avatar mr-2 d-inline-flex">{initials}</span>
              <span className="d-none d-md-inline font-weight-bold">{fullName}</span>
            </button>
            <div className={`dropdown-menu dropdown-menu-right shadow ${userMenuOpen ? 'show' : ''}`}>
              <span className="dropdown-item-text text-muted small">{user?.username}</span>
              {roleLabel && (
                <span className="dropdown-item-text d-md-none small text-muted">{roleLabel}</span>
              )}
              <div className="dropdown-divider" />
              <button type="button" className="dropdown-item text-danger" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt mr-2" />
                Déconnexion
              </button>
            </div>
          </li>
        </ul>
      </nav>

      <aside className="main-sidebar sidebar-light sidebar-edusaas elevation-1">
        <a href="/" className="brand-link" onClick={(e) => e.preventDefault()}>
          {brandLogo ? (
            <img src={brandLogo} alt="" className="brand-image" />
          ) : (
            <span className="brand-icon-wrap">
              <i className={`fas ${brandIcon}`} />
            </span>
          )}
          <span className="brand-text">
            <span className="brand-title">{brandTitle}</span>
            {brandSubtitle && <span className="brand-subtitle">{brandSubtitle}</span>}
          </span>
        </a>

        <div className="sidebar">
          <div className="user-panel d-flex">
            <span className="user-avatar">{initials}</span>
            <div className="info">
              <span className="user-name">{fullName}</span>
              {roleLabel && <span className="user-role">{roleLabel}</span>}
            </div>
          </div>

          <div className="sidebar-menu-scroll">{sidebar}</div>

          <div className="sidebar-bottom">
            <button type="button" className="sidebar-logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="content-wrapper" onClick={onContentClick}>
        {pageTitle && (
          <div className="content-header d-none d-md-block">
            <div className="container-fluid">
              <div className="row align-items-center">
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
          <div className="container-fluid">
            {pageSubtitle && (
              <p className="d-md-none edusaas-mobile-subtitle text-muted">{pageSubtitle}</p>
            )}
            {children}
          </div>
        </section>
      </div>

      <footer className="main-footer">
        <strong>EduSaaS</strong> — Gestion Scolaire
        <span className="float-right d-none d-sm-inline-block text-muted">v1.0</span>
      </footer>
    </div>
  );
}
