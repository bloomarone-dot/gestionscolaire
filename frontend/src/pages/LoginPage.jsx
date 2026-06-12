import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loginProfessor } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      if (userType === 'admin') {
        await login(username, password);
      } else {
        await loginProfessor(username, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <span className="brand-link border-0">
            <i className="fas fa-graduation-cap mr-2" />
            <b>Edu</b>SaaS
          </span>
        </div>

        <div className="card card-outline card-primary">
          <div className="card-header text-center">
            <p className="mb-0 text-muted">Connectez-vous à votre espace de gestion</p>
          </div>
          <div className="card-body login-card-body">
            <div className="btn-group btn-group-toggle d-flex mb-3">
              <button
                type="button"
                className={`btn ${userType === 'admin' ? 'btn-primary' : 'btn-default'}`}
                onClick={() => { setUserType('admin'); setError(''); }}
              >
                <i className="fas fa-user-shield mr-1" />
                Admin
              </button>
              <button
                type="button"
                className={`btn ${userType === 'professor' ? 'btn-primary' : 'btn-default'}`}
                onClick={() => { setUserType('professor'); setError(''); }}
              >
                <i className="fas fa-chalkboard-teacher mr-1" />
                Professeur
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="input-group mb-3">
                <input
                  id="username"
                  className="form-control"
                  type="text"
                  placeholder="Téléphone"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
                <div className="input-group-append">
                  <div className="input-group-text"><span className="fas fa-phone" /></div>
                </div>
              </div>

              <div className="input-group mb-3">
                <input
                  id="password"
                  className="form-control"
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <div className="input-group-append">
                  <div className="input-group-text"><span className="fas fa-lock" /></div>
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <p className="text-muted text-sm mt-3 text-center">
              Identifiant oublié ? Contactez {userType === 'professor' ? "l'administrateur de votre établissement" : 'le super administrateur'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
