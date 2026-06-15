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
      {loading ? (
        <div className="card"><div className="card-body text-muted">Chargement...</div></div>
      ) : admins.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="fas fa-user-shield fa-2x text-muted mb-3" />
            <p className="text-muted mb-0">Aucun administrateur. Créez un établissement pour en générer un automatiquement.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Administrateurs</h3>
          </div>
          <div className="card-body table-responsive p-0">
            <table className="table table-hover text-nowrap mb-0">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Établissement</th>
                  <th>Statut</th>
                  <th>Créé le</th>
                  <th className="text-right">Actions</th>
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
                      <span className={`badge ${admin.is_active ? 'badge-success' : 'badge-secondary'}`}>
                        {admin.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>{admin.created_at ? new Date(admin.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="text-right">
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-default" onClick={() => setResetAdmin(admin)}>
                          <i className="fas fa-key mr-1" />
                          Réinitialiser
                        </button>
                        {assigning === admin.id ? (
                          <select
                            className="form-control form-control-sm"
                            defaultValue={admin.school_id || ''}
                            onChange={(e) => handleAssign(admin.id, e.target.value)}
                          >
                            <option value="">Choisir établissement...</option>
                            {schools.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        ) : (
                          <button className="btn btn-default" onClick={() => setAssigning(admin.id)}>
                            <i className="fas fa-link mr-1" />
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
