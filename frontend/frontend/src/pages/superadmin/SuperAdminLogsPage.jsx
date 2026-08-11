import { useState, useEffect } from 'react';
import * as api from '../../api/api';

const ACTION_LABELS = {
  created_school: 'Création établissement',
  updated_school: 'Modification établissement',
  deleted_school: 'Suppression établissement',
  assigned_admin: 'Assignation admin',
};

export default function SuperAdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchSuperAdminLogs()
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {loading ? (
        <div className="card"><div className="card-body text-muted">Chargement...</div></div>
      ) : logs.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="fas fa-list-alt fa-2x text-muted mb-3" />
            <p className="text-muted mb-0">Aucune activité enregistrée</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Journal d'activité</h3>
          </div>
          <div className="card-body table-responsive p-0">
            <table className="table table-hover text-nowrap mb-0">
              <thead>
                <tr>
                  <th>Date & Heure</th>
                  <th>Action</th>
                  <th>Description</th>
                  <th>Utilisateur</th>
                  <th>Établissement</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.timestamp).toLocaleString('fr-FR')}</td>
                    <td><span className="badge badge-info">{ACTION_LABELS[log.action] || log.action}</span></td>
                    <td>{log.description}</td>
                    <td>{log.admin_username || '—'}</td>
                    <td>{log.school_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
