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
      {loading ? (
        <div className="card"><div className="card-body text-muted">Chargement...</div></div>
      ) : (
        <div className="row">
          <div className="col-lg-7">
            <div className="card card-primary card-outline">
              <div className="card-header">
                <h3 className="card-title"><i className="fas fa-cog mr-2" />Configuration système</h3>
              </div>
              <div className="card-body p-0">
                <table className="table mb-0">
                  <tbody>
                    <tr><th>Application</th><td>{settings?.app_name || 'EduSaaS'}</td></tr>
                    <tr><th>Version</th><td>{settings?.version || '—'}</td></tr>
                    <tr><th>Mode base de données</th><td><code>{settings?.database_mode || 'services'}</code></td></tr>
                    <tr><th>Stratégie multi-tenant</th><td><code>{settings?.multi_tenant_strategy || 'tenant_id'}</code></td></tr>
                    {!loading && settings?.database_mode === 'sql_server' && (
                      <tr>
                        <th>Serveur SQL par défaut</th>
                        <td>
                          <code>{settings.default_tenant_db_host}:{settings.default_tenant_db_port}</code>
                          {' '}({settings.default_tenant_db_username})
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title"><i className="fas fa-sitemap mr-2" />Architecture</h3>
              </div>
              <div className="card-body">
                <ul className="list-unstyled mb-0">
                  <li className="mb-2"><i className="fas fa-database text-primary mr-2" />Base maître: établissements, admins, logs</li>
                  <li className="mb-2"><i className="fas fa-school text-success mr-2" />Données école isolées par tenant</li>
                  <li><i className="fas fa-lock text-warning mr-2" />Isolation des données entre établissements</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
