import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import '../styles/navbar.css';

export default function Navbar() {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">📚</span>
          <span className="logo-text">EduGestion</span>
        </Link>

        {/* Nav Links */}
        <ul className="nav-menu">
          <li><a href="#features">Fonctionnalités</a></li>
          <li><a href="#about">À propos</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>

        {/* CTA Button */}
        <div className="nav-cta">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-primary">
              Tableau de bord
            </Link>
          ) : (
            <Link to="/login" className="btn-primary">
              Se connecter
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
