import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/api';
import '../styles/db-config-panel.css';

const STATUS_COLORS = {
  connected: '#4ade80',
  error: '#f87171',
  missing: '#fb923c',
};

const STATUS_ICONS = {
  connected: '✅',
  error: '❌',
  missing: '⚠️',
};

export default function SchoolDbConfigPanel({ school, onUpdated }) {
  const [databaseMode, setDatabaseMode] = useState(null);
  const [form, setForm] = useState({
    db_host: school.db_host || 'localhost',
    db_port: school.db_port || 1433,
    db_username: school.db_username || '',
    db_password: '',
  });
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.fetchSuperAdminSettings()
      .then((s) => setDatabaseMode(s.database_mode))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setForm({
      db_host: school.db_host || 'localhost',
      db_port: school.db_port || 1433,
      db_username: school.db_username || '',
      db_password: '',
    });
  }, [school]);

  const runTest = useCallback(async () => {
    setTesting(true);
    setError('');
    try {
      const result = await api.testSchoolConnection(school.id);
      setTestResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  }, [school.id]);

  useEffect(() => {
    runTest();
  }, [runTest]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = { ...form };
      if (!payload.db_password) delete payload.db_password;
      const result = await api.updateSchoolDbConfig(school.id, payload);
      setTestResult({ status: result.db_status, message: result.db_message });
      setSuccess('Configuration enregistrée');
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isSqlite = databaseMode === 'sqlite';

  return (
    <div className="db-config-panel">
      <div className="db-config-header">
        <h3>⚙️ Configuration base de données</h3>
        <div className="db-schema-info">
          Base dédiée : <code>{school.db_name}</code>
          {databaseMode && (
            <span className="db-mode-tag">Mode : {databaseMode}</span>
          )}
        </div>
      </div>

      <div
        className="db-status-indicator"
        style={{ borderColor: STATUS_COLORS[testResult?.status] || 'var(--border)' }}
      >
        <span className="db-status-icon">
          {testResult ? STATUS_ICONS[testResult.status] : '🔌'}
        </span>
        <div>
          <div
            className="db-status-text"
            style={{ color: testResult ? STATUS_COLORS[testResult.status] : 'var(--text-secondary)' }}
          >
            {testResult ? testResult.status.toUpperCase() : 'Non testé'}
          </div>
          <div className="db-status-message">
            {testResult?.message || 'Test de connexion en cours...'}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm db-test-btn"
          onClick={runTest}
          disabled={testing}
        >
          {testing ? '...' : '🔍 Tester'}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      {isSqlite ? (
        <div className="db-sqlite-info">
          <p>
            En mode <strong>SQLite</strong>, chaque établissement dispose d'un fichier dédié dans
            le dossier <code>tenants/</code>. Aucune configuration SQL Server n'est requise.
          </p>
          <div className="info-row">
            <span className="info-label">Fichier tenant</span>
            <code>tenants/{school.db_name}.db</code>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="db-config-form">
          <p className="form-section-hint" style={{ marginBottom: '0.75rem' }}>
            Connexion au serveur SQL Server où la base <code>{school.db_name}</code> a été créée.
            Chaque établissement possède sa propre base isolée.
          </p>
          <div className="db-config-row">
            <div className="form-group">
              <label>Hôte</label>
              <input
                value={form.db_host}
                onChange={(e) => setForm({ ...form, db_host: e.target.value })}
                placeholder="localhost"
              />
            </div>
            <div className="form-group form-group-sm">
              <label>Port</label>
              <input
                type="number"
                value={form.db_port}
                onChange={(e) => setForm({ ...form, db_port: parseInt(e.target.value) || 1433 })}
                placeholder="1433"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Utilisateur</label>
            <input
              value={form.db_username}
              onChange={(e) => setForm({ ...form, db_username: e.target.value })}
              placeholder="sa"
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              value={form.db_password}
              onChange={(e) => setForm({ ...form, db_password: e.target.value })}
              placeholder="Laisser vide pour conserver le mot de passe actuel"
              autoComplete="new-password"
            />
          </div>

          <div className="db-config-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Enregistrement...' : '💾 Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
