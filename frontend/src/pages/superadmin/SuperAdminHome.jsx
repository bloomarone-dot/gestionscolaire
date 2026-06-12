import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../api/api';

const ACTION_LABELS = {
  created_school: 'Création établissement',
  updated_school: 'Modification établissement',
  deleted_school: 'Suppression établissement',
  assigned_admin: 'Assignation admin',
};

export default function SuperAdminHome() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchSuperAdminStats()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="card"><div className="card-body text-muted">Chargement du tableau de bord...</div></div>;
  }

  const maxCityCount = Math.max(...(data?.schools_by_city?.map((c) => c.count) || [1]), 1);

  return (
    <div>
      <div className="row">
        {[
          ['fa-building', 'info', data?.total_schools ?? 0, 'Établissements'],
          ['fa-check-circle', 'success', data?.active_schools ?? 0, 'Actifs'],
          ['fa-user-shield', 'primary', data?.total_admins ?? 0, 'Administrateurs'],
          ['fa-users', 'warning', data?.total_eleves ?? 0, 'Élèves'],
          ['fa-chalkboard-teacher', 'secondary', data?.total_professeurs ?? 0, 'Professeurs'],
          ['fa-bolt', 'danger', data?.today_activity ?? 0, "Activité aujourd'hui"],
        ].map(([icon, color, value, label]) => (
          <div key={label} className="col-12 col-sm-6 col-xl-4">
            <div className="info-box">
              <span className={`info-box-icon bg-${color}`}><i className={`fas ${icon}`} /></span>
              <div className="info-box-content">
                <span className="info-box-text">{label}</span>
                <span className="info-box-number">{value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><i className="fas fa-chart-bar mr-2" />Établissements par ville</h3>
            </div>
            <div className="card-body">
              {data?.schools_by_city?.length > 0 ? (
                data.schools_by_city.map(({ city, count }) => (
                  <div key={city} className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-truncate" title={city}>{city}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="progress progress-sm">
                      <div
                        className="progress-bar bg-primary"
                        style={{ width: `${(count / maxCityCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted mb-0">Aucun établissement enregistré</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><i className="fas fa-building mr-2" />Établissements récents</h3>
              <div className="card-tools">
                <Link to="/superadmin/schools" className="btn btn-tool text-primary">Gérer</Link>
              </div>
            </div>
            <div className="card-body p-0">
              {data?.recent_schools?.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {data.recent_schools.map((school) => (
                    <li key={school.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>
                        <strong>{school.name}</strong>
                        <small className="d-block text-muted">
                          {school.city} · {new Date(school.created_at).toLocaleDateString('fr-FR')}
                        </small>
                      </span>
                      <span className={`badge ${school.is_active ? 'badge-success' : 'badge-secondary'}`}>
                        {school.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 text-muted">Aucun établissement récent</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><i className="fas fa-bolt mr-2" />Activité d'aujourd'hui</h3>
          <div className="card-tools">
            <Link to="/superadmin/logs" className="btn btn-tool text-primary">Historique</Link>
          </div>
        </div>
        <div className="card-body p-0">
          {data?.today_logs?.length > 0 ? (
            <ul className="list-group list-group-flush">
              {data.today_logs.map((log) => (
                <li key={log.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>
                    <strong>{ACTION_LABELS[log.action] || log.action}</strong>
                    <small className="d-block text-muted">{log.description}</small>
                  </span>
                  <small className="text-muted text-right">
                    {log.admin_username || '—'}<br />
                    {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-muted">Aucune activité aujourd'hui</div>
          )}
        </div>
      </div>
    </div>
  );
}
