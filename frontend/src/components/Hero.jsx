import { Link } from 'react-router-dom';
import { APP_NAME } from '../utils/brand';
import '../styles/hero.css';

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            Gérez vos établissements scolaires <span className="highlight">simplement</span>
          </h1>
          <p className="hero-description">
            {APP_NAME} est la plateforme complète pour la gestion des établissements scolaires.
            Primaire, collège/lycée ou centre de formation : chaque structure garde son identité.
          </p>
          
          <div className="hero-features">
            <div className="feature-item">
              <span className="feature-icon">✓</span>
              <p>Gestion multi-établissements</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">✓</span>
              <p>Saisie des notes mobile-friendly</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">✓</span>
              <p>Tableaux de bord intuitifs</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">✓</span>
              <p>Gestion des utilisateurs hiérarchisée</p>
            </div>
          </div>

          <div className="hero-cta">
            <Link to="/login" className="btn-large btn-primary">
              Commencer maintenant
            </Link>
            <a href="#features" className="btn-large btn-secondary">
              En savoir plus
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="floating-card card-1">
            <div className="card-header">Établissements</div>
            <div className="card-stat">12</div>
          </div>
          <div className="floating-card card-2">
            <div className="card-header">Professeurs</div>
            <div className="card-stat">156</div>
          </div>
          <div className="floating-card card-3">
            <div className="card-header">Élèves</div>
            <div className="card-stat">2.4K</div>
          </div>
        </div>
      </div>
    </section>
  );
}
