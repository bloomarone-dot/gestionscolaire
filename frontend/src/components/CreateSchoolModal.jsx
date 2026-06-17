import { useState, useEffect } from 'react';
import * as api from '../api/api';
import CitySelect from './CitySelect';
import { compressImageFile } from '../utils/imageCompress';
import '../styles/create-school-modal.css';

export default function CreateSchoolModal({ onClose, onSchoolCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    directeur_first_name: '',
    directeur_last_name: '',
    directeur_email: '',
    directeur_phone: '',
    logo_url: '',
    primary_color: '#8b5cf6',
    secondary_color: '#a78bfa',
    admin_username: '',
    admin_email: '',
    admin_password: '',
    admin_first_name: '',
    admin_last_name: '',
    use_default_db_server: true,
    db_host: 'localhost',
    db_port: 1433,
    db_username: 'sa',
    db_password: '',
  });

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.fetchSuperAdminSettings()
      .then((s) => {
        setSettings(s);
        setFormData((prev) => ({
          ...prev,
          db_host: s.default_tenant_db_host || prev.db_host,
          db_port: s.default_tenant_db_port || prev.db_port,
          db_username: s.default_tenant_db_username || prev.db_username,
        }));
      })
      .catch(console.error);
  }, []);

  const isSqlite = settings?.database_mode === 'sqlite';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const parsed =
      name === 'db_port'
        ? parseInt(value, 10) || 1433
        : type === 'checkbox'
          ? checked
          : value;
    setFormData((prev) => ({ ...prev, [name]: parsed }));
    if (name.startsWith('db_') || name === 'use_default_db_server') {
      setDbTestResult(null);
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const dataUrl = await compressImageFile(file);
      setFormData((prev) => ({ ...prev, logo_url: dataUrl }));
    } catch (err) {
      setError(err.message || 'Impossible de traiter l\'image');
    }
  };

  const getDbPayload = () => {
    if (formData.use_default_db_server && settings) {
      return {
        db_host: settings.default_tenant_db_host,
        db_port: settings.default_tenant_db_port,
        db_username: settings.default_tenant_db_username,
        db_password: formData.db_password,
      };
    }
    return {
      db_host: formData.db_host,
      db_port: formData.db_port,
      db_username: formData.db_username,
      db_password: formData.db_password,
    };
  };

  const handleTestDb = async () => {
    if (isSqlite) return;
    setTestingDb(true);
    setError('');
    try {
      const dbConfig = getDbPayload();
      if (!dbConfig.db_password) {
        setError('Saisissez le mot de passe SQL Server pour tester la connexion.');
        return;
      }
      const result = await api.testDbServerBeforeCreate(dbConfig);
      setDbTestResult(result);
    } catch (err) {
      setDbTestResult({ status: 'error', message: err.message });
    } finally {
      setTestingDb(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = { ...formData };
      if (!payload.logo_url) delete payload.logo_url;

      if (isSqlite) {
        payload.use_default_db_server = true;
        delete payload.db_host;
        delete payload.db_port;
        delete payload.db_username;
        delete payload.db_password;
      } else if (payload.use_default_db_server) {
        delete payload.db_host;
        delete payload.db_port;
        delete payload.db_username;
        if (!payload.db_password) delete payload.db_password;
      } else {
        if (!payload.db_password) {
          setError('Le mot de passe SQL Server est requis pour une connexion personnalisée.');
          setLoading(false);
          return;
        }
      }

      const result = await api.createSchool(payload);
      onSchoolCreated(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2>Créer un nouvel établissement</h2>
          <button type="button" className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="school-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-section">
            <h3>Informations de l&apos;établissement</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Nom de l&apos;établissement *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Royal Priesthood Academy"
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="contact@lycee.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Téléphone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="+237 6XX XXX XXX"
                />
              </div>
              <div className="form-group">
                <label>Ville *</label>
                <CitySelect
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Adresse *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="123 Rue de l'École"
                />
              </div>
              <div className="form-group">
                <label>Code postal *</label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  required
                  placeholder="00237"
                />
              </div>
            </div>
          </div>

          <div className="form-section school-db-section">
            <h3>Base de données dédiée</h3>
            <p className="form-section-hint">
              Chaque établissement dispose de sa propre base isolée (comme Sage 100).
              Les comptes admin, élèves et notes sont stockés uniquement dans cette base.
            </p>

            {isSqlite ? (
              <div className="school-db-sqlite-info">
                <p>
                  <strong>Mode développement (SQLite)</strong> — une base fichier sera créée
                  automatiquement : <code>tenants/school_[id].db</code>
                </p>
              </div>
            ) : (
              <>
                <div className="school-db-auto-name">
                  Nom automatique de la base : <code>school_[id]</code>
                  <span className="field-hint"> (ex. school_3 pour le 3ᵉ établissement)</span>
                </div>

                <label className="school-db-default-toggle">
                  <input
                    type="checkbox"
                    name="use_default_db_server"
                    checked={formData.use_default_db_server}
                    onChange={handleChange}
                  />
                  Utiliser le serveur SQL Server de l&apos;installation
                  {settings && (
                    <span className="field-hint">
                      {' '}({settings.default_tenant_db_host}:{settings.default_tenant_db_port})
                    </span>
                  )}
                </label>

                {!formData.use_default_db_server && (
                  <div className="school-db-fields">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Serveur SQL *</label>
                        <input
                          type="text"
                          name="db_host"
                          value={formData.db_host}
                          onChange={handleChange}
                          placeholder="192.168.1.10 ou sql.monserveur.local"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Port</label>
                        <input
                          type="number"
                          name="db_port"
                          value={formData.db_port}
                          onChange={handleChange}
                          placeholder="1433"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Utilisateur SQL *</label>
                        <input
                          type="text"
                          name="db_username"
                          value={formData.db_username}
                          onChange={handleChange}
                          placeholder="sa"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Mot de passe SQL *</label>
                        <input
                          type="password"
                          name="db_password"
                          value={formData.db_password}
                          onChange={handleChange}
                          placeholder="Mot de passe du compte SQL"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formData.use_default_db_server && (
                  <div className="form-group">
                    <label>Mot de passe SQL (serveur par défaut)</label>
                    <input
                      type="password"
                      name="db_password"
                      value={formData.db_password}
                      onChange={handleChange}
                      placeholder="Requis pour tester ; optionnel si déjà configuré côté serveur"
                      autoComplete="new-password"
                    />
                  </div>
                )}

                <div className="school-db-test-row">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleTestDb}
                    disabled={testingDb}
                  >
                    {testingDb ? 'Test en cours…' : '🔍 Tester la connexion SQL Server'}
                  </button>
                  {dbTestResult && (
                    <span
                      className={`school-db-test-result school-db-test-${dbTestResult.status}`}
                    >
                      {dbTestResult.status === 'connected' ? '✅' : '❌'} {dbTestResult.message}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="form-section">
            <h3>Identité visuelle</h3>
            <p className="form-section-hint">Logo et couleurs affichés dans l&apos;interface admin et professeur</p>

            <div className="form-group">
              <label>Logo de l&apos;établissement</label>
              <input type="file" accept="image/*" onChange={handleLogoChange} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Couleur principale</label>
                <div className="color-input-row">
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                  />
                  <input
                    type="text"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    placeholder="#10b981"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Couleur secondaire</label>
                <div className="color-input-row">
                  <input
                    type="color"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleChange}
                  />
                  <input
                    type="text"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleChange}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    placeholder="#f59e0b"
                  />
                </div>
              </div>
            </div>

            <div className="branding-preview">
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Aperçu logo" className="branding-preview-logo" />
              ) : (
                <div className="branding-preview-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  🏫
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{formData.name || 'Nom établissement'}</div>
                <div className="branding-preview-swatches">
                  <div className="branding-swatch" style={{ background: formData.primary_color }} title="Principale" />
                  <div className="branding-swatch" style={{ background: formData.secondary_color }} title="Secondaire" />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Directeur de l&apos;établissement</h3>
            <p className="form-section-hint">Identité du directeur (distincte du compte administrateur IT)</p>
            <div className="form-row">
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  name="directeur_first_name"
                  value={formData.directeur_first_name}
                  onChange={handleChange}
                  required
                  placeholder="Nom du directeur"
                />
              </div>
              <div className="form-group">
                <label>Prénom</label>
                <input
                  type="text"
                  name="directeur_last_name"
                  value={formData.directeur_last_name}
                  onChange={handleChange}
                  placeholder="Prénom (facultatif)"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="directeur_email"
                  value={formData.directeur_email}
                  onChange={handleChange}
                  placeholder="directeur@lycee.com"
                />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  name="directeur_phone"
                  value={formData.directeur_phone}
                  onChange={handleChange}
                  placeholder="+237 6XX XXX XXX"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Administrateur IT de l&apos;établissement</h3>
            <p className="form-section-hint">Compte de connexion pour la gestion de la plateforme</p>
            <div className="form-row">
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  name="admin_first_name"
                  value={formData.admin_first_name}
                  onChange={handleChange}
                  required
                  placeholder="Nom de l'administrateur"
                />
              </div>
              <div className="form-group">
                <label>Prénom</label>
                <input
                  type="text"
                  name="admin_last_name"
                  value={formData.admin_last_name}
                  onChange={handleChange}
                  placeholder="Prénom (facultatif)"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nom d&apos;utilisateur *</label>
                <input
                  type="text"
                  name="admin_username"
                  value={formData.admin_username}
                  onChange={handleChange}
                  required
                  placeholder="admin_lycee"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="admin_email"
                  value={formData.admin_email}
                  onChange={handleChange}
                  placeholder="admin@lycee.com (facultatif)"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Mot de passe *</label>
                <input
                  type="password"
                  name="admin_password"
                  value={formData.admin_password}
                  onChange={handleChange}
                  required
                  placeholder="Minimum 8 caractères"
                  minLength="8"
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Création en cours...' : 'Créer l\'établissement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
