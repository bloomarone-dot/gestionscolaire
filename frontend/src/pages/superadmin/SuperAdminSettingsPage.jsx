import { useState, useEffect } from 'react';
import * as api from '../../api/api';

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchSuperAdminSettings()
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="sa-page-header">
        <h1 className="sa-page-title">Paramètres</h1>
        <p className="sa-page-subtitle">Configuration globale de la plateforme</p>
      </div>

      {loading ? (
        <div className="sa-empty">Chargement...</div>
      ) : (
        <div className="sa-panel" style={{ maxWidth: 600 }}>
          <h2 className="sa-panel-title">⚙️ Configuration système</h2>
          <div className="info-row">
            <span className="info-label">Application</span>
            <span>{settings?.app_name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Version</span>
            <span>{settings?.version}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Mode base de données</span>
            <span><code>{settings?.database_mode}</code></span>
          </div>
          <div className="info-row">
            <span className="info-label">Stratégie multi-tenant</span>
            <span><code>{settings?.multi_tenant_strategy}</code></span>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(99,102,241,0.08)', borderRadius: '8px' }}>
            <strong>Architecture prévue :</strong>
            <ul style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <li>Schema <code>superadmin</code> → établissements, admins, logs</li>
              <li>Schema <code>school_[ID]</code> → élèves, profs, classes, notes</li>
              <li>Isolation des données par établissement</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
