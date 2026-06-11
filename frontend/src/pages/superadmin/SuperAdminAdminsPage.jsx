import { useState, useEffect } from 'react';
import * as api from '../../api/api';
import ResetCredentialsModal from '../../components/ResetCredentialsModal';

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [resetAdmin, setResetAdmin] = useState(null);

  useEffect(() => {
    Promise.all([api.fetchSuperAdminAdmins(), api.fetchSchools()])
      .then(([adminsData, schoolsData]) => {
        setAdmins(adminsData);
        setSchools(schoolsData.filter((s) => s?.id != null));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAssign = async (adminId, schoolId) => {
    if (!schoolId) return;
    try {
      await api.assignAdminToSchool(adminId, parseInt(schoolId, 10));
      const school = schools.find((s) => s.id === parseInt(schoolId, 10));
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === adminId
            ? { ...a, school_id: school?.id, school_name: school?.name }
            : a
        )
      );
      setAssigning(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetSuccess = (adminId, newUsername) => {
    setAdmins((prev) =>
      prev.map((a) => (a.id === adminId ? { ...a, username: newUsername || a.username } : a))
    );
    setResetAdmin(null);
  };

  return (
    <div>
      <div className="sa-page-header">
        <h1 className="sa-page-title">Administrateurs</h1>
        <p className="sa-page-subtitle">
          Consulter, assigner et réinitialiser les identifiants des administrateurs d&apos;établissement
        </p>
      </div>

      {loading ? (
        <div className="sa-empty">Chargement...</div>
      ) : admins.length === 0 ? (
        <div className="sa-empty">
          Aucun administrateur. Créez un établissement pour en générer un automatiquement.
        </div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Username</th>
                <th>Email</th>
                <th>Établissement</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.first_name} {admin.last_name}</td>
                  <td><code>{admin.username}</code></td>
                  <td>{admin.email || '—'}</td>
                  <td>{admin.school_name || '—'}</td>
                  <td>
                    <span className={`sa-badge ${admin.is_active ? 'sa-badge-active' : 'sa-badge-inactive'}`}>
                      {admin.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td>{new Date(admin.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                        onClick={() => setResetAdmin(admin)}
                      >
                        Réinitialiser identifiants
                      </button>
                      {assigning === admin.id ? (
                        <select
                          className="sa-filter-select"
                          defaultValue={admin.school_id || ''}
                          onChange={(e) => handleAssign(admin.id, e.target.value)}
                        >
                          <option value="">Choisir établissement...</option>
                          {schools.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                          onClick={() => setAssigning(admin.id)}
                        >
                          Assigner
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resetAdmin && (
        <ResetCredentialsModal
          title="Réinitialiser les identifiants admin"
          subtitle={`${resetAdmin.first_name || ''} ${resetAdmin.last_name || ''}`.trim() || resetAdmin.username}
          currentUsername={resetAdmin.username}
          onClose={() => setResetAdmin(null)}
          onSubmit={async (payload) => {
            const result = await api.resetAdminCredentials(resetAdmin.id, payload);
            handleResetSuccess(resetAdmin.id, result.username);
            return result;
          }}
        />
      )}
    </div>
  );
}
