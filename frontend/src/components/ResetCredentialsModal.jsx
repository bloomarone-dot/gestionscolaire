import { useState } from 'react';
import '../styles/modal-forms.css';

export default function ResetCredentialsModal({
  title,
  subtitle,
  currentUsername,
  onClose,
  onSubmit,
}) {
  const [username, setUsername] = useState(currentUsername || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await onSubmit({
        username: username.trim() || undefined,
        password,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {subtitle && <p className="form-section-hint">{subtitle}</p>}
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label>Nouvel identifiant (optionnel)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={currentUsername}
            />
          </div>
          <div className="form-group">
            <label>Nouveau mot de passe *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enregistrement…' : 'Réinitialiser'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
