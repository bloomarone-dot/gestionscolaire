import { useState, useEffect } from 'react';
import * as api from '../../api/api';

const ACTION_LABELS = {
  created_school: '🏛️ Création établissement',
  updated_school: '✏️ Modification établissement',
  deleted_school: '🗑️ Suppression établissement',
  assigned_admin: '👤 Assignation admin',
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
        <div className="sa-empty">Chargement...</div>
      ) : logs.length === 0 ? (
        <div className="sa-empty">Aucune activité enregistrée</div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
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
                  <td>{ACTION_LABELS[log.action] || log.action}</td>
                  <td>{log.description}</td>
                  <td>{log.admin_username || '—'}</td>
                  <td>{log.school_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
