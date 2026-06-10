import '../styles/footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>EduGestion</h3>
          <p>La plateforme complète de gestion d'établissements scolaires.</p>
        </div>

        <div className="footer-section">
          <h4>Navigation</h4>
          <ul>
            <li><a href="#features">Fonctionnalités</a></li>
            <li><a href="#about">À propos</a></li>
            <li><a href="#pricing">Tarifs</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Support</h4>
          <ul>
            <li><a href="mailto:support@edugestion.com">support@edugestion.com</a></li>
            <li><a href="tel:+1234567890">+1 (234) 567-890</a></li>
            <li><a href="#help">Centre d'aide</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Légal</h4>
          <ul>
            <li><a href="#privacy">Confidentialité</a></li>
            <li><a href="#terms">Conditions d'utilisation</a></li>
            <li><a href="#cookies">Cookies</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} EduGestion. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
