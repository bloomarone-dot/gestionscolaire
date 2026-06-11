import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../api/api';

const ACTION_LABELS = {
  created_school: 'Création établissement',
  updated_school: 'Modification établissement',
  deleted_school: 'Suppression établissement',
  assigned_admin: 'Assignation admin',
};

export default function SuperAdminHome() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchSuperAdminStats()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="sa-empty">Chargement du tableau de bord...</div>;
  }

  const maxCityCount = Math.max(...(data?.schools_by_city?.map((c) => c.count) || [1]), 1);

  return (
    <div>
      <div className="sa-stats-grid">
        <div className="sa-stat-card">
          <div className="sa-stat-icon">🏛️</div>
          <div>
            <div className="sa-stat-value">{data?.total_schools ?? 0}</div>
            <div className="sa-stat-label">Établissements</div>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon">✅</div>
          <div>
            <div className="sa-stat-value">{data?.active_schools ?? 0}</div>
            <div className="sa-stat-label">Actifs</div>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon">👤</div>
          <div>
            <div className="sa-stat-value">{data?.total_admins ?? 0}</div>
            <div className="sa-stat-label">Administrateurs</div>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon">👥</div>
          <div>
            <div className="sa-stat-value">{data?.total_eleves ?? 0}</div>
            <div className="sa-stat-label">Élèves (total)</div>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon">👨‍🏫</div>
          <div>
            <div className="sa-stat-value">{data?.total_professeurs ?? 0}</div>
            <div className="sa-stat-label">Professeurs</div>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon">⚡</div>
          <div>
            <div className="sa-stat-value">{data?.today_activity ?? 0}</div>
            <div className="sa-stat-label">Activité aujourd'hui</div>
          </div>
        </div>
      </div>

      <div className="sa-grid-2">
        <div className="sa-panel">
          <h2 className="sa-panel-title">📊 Établissements par ville</h2>
          {data?.schools_by_city?.length > 0 ? (
            <div className="sa-bar-chart">
              {data.schools_by_city.map(({ city, count }) => (
                <div key={city} className="sa-bar-row">
                  <span className="sa-bar-label" title={city}>{city}</span>
                  <div className="sa-bar-track">
                    <div
                      className="sa-bar-fill"
                      style={{ width: `${(count / maxCityCount) * 100}%` }}
                    >
                      <span className="sa-bar-value">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="sa-empty">Aucun établissement enregistré</p>
          )}
        </div>

        <div className="sa-panel">
          <h2 className="sa-panel-title">🚀 Établissements récents</h2>
          {data?.recent_schools?.length > 0 ? (
            data.recent_schools.map((school) => (
              <div key={school.id} className="sa-list-item">
                <div>
                  <div className="sa-list-name">{school.name}</div>
                  <div className="sa-list-meta">
                    {school.city} · {new Date(school.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <span className={`sa-badge ${school.is_active ? 'sa-badge-active' : 'sa-badge-inactive'}`}>
                  {school.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            ))
          ) : (
            <p className="sa-empty">Aucun établissement récent</p>
          )}
          <Link to="/superadmin/schools" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
            Gérer les établissements →
          </Link>
        </div>
      </div>

      <div className="sa-panel">
        <h2 className="sa-panel-title">⚡ Activité d'aujourd'hui</h2>
        {data?.today_logs?.length > 0 ? (
          data.today_logs.map((log) => (
            <div key={log.id} className="sa-list-item">
              <div>
                <div className="sa-list-name">
                  {ACTION_LABELS[log.action] || log.action}
                </div>
                <div className="sa-list-meta">{log.description}</div>
              </div>
              <div className="sa-list-meta" style={{ textAlign: 'right' }}>
                <div>{log.admin_username || '—'}</div>
                <div>{new Date(log.timestamp).toLocaleTimeString('fr-FR')}</div>
              </div>
            </div>
          ))
        ) : (
          <p className="sa-empty">Aucune activité aujourd'hui</p>
        )}
        <Link to="/superadmin/logs" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-block' }}>
          Voir tout l'historique →
        </Link>
      </div>
    </div>
  );
}
