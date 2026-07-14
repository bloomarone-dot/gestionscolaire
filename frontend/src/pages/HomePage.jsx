import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Footer from '../components/Footer';
import '../styles/navbar.css';
import '../styles/hero.css';
import '../styles/home-page.css';
import '../styles/footer.css';

export default function HomePage() {
  return (
    <div className="home-page">
      <Navbar />
      
      <main className="home-main">
        <Hero />

        {/* Section Fonctionnalités */}
        <section id="features" className="features-section">
          <div className="section-container">
            <h2>Nos Fonctionnalités Principales</h2>
            
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon-large">🏛️</div>
                <h3>Gestion Multi-Établissements</h3>
                <p>Gérez plusieurs établissements scolaires depuis un seul super-administrateur.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-large">👨‍💼</div>
                <h3>Rôles Hiérarchisés</h3>
                <p>Super-admin, Administrateur, Professeur. Chacun avec ses permissions.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-large">📱</div>
                <h3>Accès Mobile</h3>
                <p>Saisissez les notes depuis n'importe quel appareil, n'importe où.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-large">📊</div>
                <h3>Tableaux de Bord</h3>
                <p>Visualisez les données en temps réel avec des graphiques intuitifs.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-large">🖨️</div>
                <h3>Impression & Export</h3>
                <p>Imprimez les bulletins et rapports en un seul clic.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-large">🔒</div>
                <h3>Sécurité Robuste</h3>
                <p>Authentification sécurisée et données protégées.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section À Propos */}
        <section id="about" className="about-section">
          <div className="section-container">
            <div className="about-content">
              <div className="about-text">
                <h2>Pourquoi BloomSchool ?</h2>
                <p>
                  BloomSchool simplifie la gestion administrative des établissements scolaires.
                  Notre plateforme a été conçue pour le primaire, le collège/lycée et les centres
                  de formation, avec une interface intuitive et des fonctionnalités adaptées à chaque type.
                </p>
                <ul className="about-list">
                  <li>✓ Économisez du temps administratif</li>
                  <li>✓ Réduisez les erreurs de saisie</li>
                  <li>✓ Centralisez toutes vos données</li>
                  <li>✓ Améliorez la communication</li>
                </ul>
              </div>
              <div className="about-stats">
                <div className="stat-box">
                  <div className="stat-number">500+</div>
                  <div className="stat-label">Établissements</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number">50K+</div>
                  <div className="stat-label">Utilisateurs actifs</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number">99.9%</div>
                  <div className="stat-label">Disponibilité</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
