import '../styles/footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>Bloomarone</h3>
          <p>
            Solution de gestion scolaire multi-établissements — notes, bulletins,
            professeurs et administration centralisée.
          </p>
        </div>

        <div className="footer-section">
          <h4>Contact</h4>
          <ul>
            <li>
              <a href="tel:+237652209175">+237 652 209 175</a>
            </li>
            <li>
              <a href="mailto:Contact@bloomarone.com">Contact@bloomarone.com</a>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Adresse</h4>
          <p>
            Derrière le Stade Annexe de la Mobile Omnisport,
            à côté de l&apos;hôtel Grand Président — Yaoundé, Cameroun
          </p>
        </div>

        <div className="footer-section">
          <h4>Navigation</h4>
          <ul>
            <li><a href="#features">Fonctionnalités</a></li>
            <li><a href="/login">Connexion</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} Bloomarone — EduSaaS. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
