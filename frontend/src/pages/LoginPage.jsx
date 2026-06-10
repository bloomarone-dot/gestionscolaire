import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/api';

export default function LoginPage() {
  const { login, loginProfessor } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState('admin'); // 'admin' ou 'professor'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSchools = useCallback(async () => {
    try {
      const data = await api.fetchSchoolsPublic();
      setSchools(data);
    } catch (err) {
      console.error('Erreur chargement établissements:', err);
    }
  }, []);

  useEffect(() => {
    if (userType === 'professor') {
      loadSchools();
    }
  }, [userType, loadSchools]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (userType === 'professor' && !schoolId) {
      setError('Veuillez sélectionner un établissement.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      if (userType === 'admin') {
        await login(username, password);
      } else {
        await loginProfessor(username, password, parseInt(schoolId));
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
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">🎓</div>
          <h1>EduSaaS</h1>
          <p>Connectez-vous à votre espace de gestion</p>
        </div>

        {/* Sélecteur de type utilisateur */}
        <div className="login-tabs">
          <button
            className={`login-tab ${userType === 'admin' ? 'active' : ''}`}
            onClick={() => { setUserType('admin'); setError(''); }}
          >
            👤 Admin
          </button>
          <button
            className={`login-tab ${userType === 'professor' ? 'active' : ''}`}
            onClick={() => { setUserType('professor'); setError(''); }}
          >
            👨‍🏫 Professeur
          </button>
        </div>

        {/* Formulaire */}
        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {userType === 'professor' && (
            <div className="form-group">
              <label htmlFor="school">Établissement</label>
              <select
                id="school"
                value={schoolId}
                onChange={e => setSchoolId(e.target.value)}
                required
              >
                <option value="">-- Sélectionner un établissement --</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>
                    {school.name} ({school.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              id="username"
              type="text"
              placeholder={userType === 'admin' ? 'admin' : 'prof_username'}
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Se connecter'}
          </button>
        </form>

        <p className="text-muted text-sm mt-16" style={{ textAlign: 'center' }}>
          EduSaaS — Gestion Scolaire © 2025
        </p>
      </div>
    </div>
  );
}
