import { useState, useEffect, useMemo } from 'react';
import * as api from '../../api/api';
import CreateSchoolModal from '../../components/CreateSchoolModal';
import SchoolDetailModal from '../../components/SchoolDetailModal';
import CitySelect from '../../components/CitySelect';

export default function SuperAdminSchoolsPage() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailSchoolId, setDetailSchoolId] = useState(null);
  const [editingSchool, setEditingSchool] = useState(null);

  const loadSchools = async () => {
    try {
      setLoading(true);
      const data = await api.fetchSchools(true);
      setSchools(data.filter((s) => s?.id != null));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
  }, []);

  const filtered = useMemo(() => {
    return schools.filter((s) => {
      const matchSearch =
        !search ||
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.city?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && s.is_active) ||
        (statusFilter === 'inactive' && !s.is_active);
      return matchSearch && matchStatus;
    });
  }, [schools, search, statusFilter]);

  const handleDelete = async (schoolId, schoolName) => {
    if (!window.confirm(`Supprimer "${schoolName}" ?`)) return;
    try {
      await api.deleteSchool(schoolId);
      setSchools((prev) => prev.filter((s) => s.id !== schoolId));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      {loading ? (
        <div className="card"><div className="card-body text-muted">Chargement...</div></div>
      ) : schools.length === 0 ? (
        <div className="card card-empty">
          <div className="card-body text-center py-5">
            <i className="fas fa-building fa-2x text-muted mb-3" />
            <p className="text-muted">Aucun établissement trouvé</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <i className="fas fa-plus mr-1" />
              Créer le premier établissement
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Établissements</h3>
            <div className="card-tools">
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                <i className="fas fa-plus mr-1" />
                Créer
              </button>
            </div>
          </div>
          <div className="card-body border-bottom">
            <div className="row">
              <div className="col-md-8 mb-2 mb-md-0">
                <input
                  type="search"
                  className="form-control"
                  placeholder="Rechercher par nom, ville, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <select
                  className="form-control"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Inactifs</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card-body table-responsive p-0">
            <table className="table table-hover text-nowrap mb-0">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Ville</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Schema BD</th>
                  <th>Connexion BD</th>
                  <th>Statut</th>
                  <th>Créé le</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-muted py-4">Aucun résultat pour ces filtres.</td>
                  </tr>
                ) : (
                  filtered.map((school) => (
                    <tr key={school.id}>
                      <td><strong>{school.name}</strong></td>
                      <td>{school.city || '—'}</td>
                      <td>{school.email || '—'}</td>
                      <td>{school.phone || '—'}</td>
                      <td><code>{school.db_name || school.code || '—'}</code></td>
                      <td><DbStatusBadge status={school.db_status} /></td>
                      <td>
                        <span className={`badge ${school.is_active ? 'badge-success' : 'badge-secondary'}`}>
                          {school.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>{school.created_at ? new Date(school.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                      <td className="text-right">
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-default" title="Détails" onClick={() => setDetailSchoolId(school.id)}>
                            <i className="fas fa-eye" />
                          </button>
                          <button className="btn btn-default" title="Modifier" onClick={() => setEditingSchool(school)}>
                            <i className="fas fa-edit" />
                          </button>
                          <button className="btn btn-danger" title="Supprimer" onClick={() => handleDelete(school.id, school.name)}>
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateSchoolModal
          onClose={() => setShowCreateModal(false)}
          onSchoolCreated={(school) => {
            if (school?.id) setSchools((prev) => [...prev, school]);
            else loadSchools();
            setShowCreateModal(false);
          }}
        />
      )}

      {detailSchoolId && (
        <SchoolDetailModal
          schoolId={detailSchoolId}
          onClose={() => setDetailSchoolId(null)}
        />
      )}

      {editingSchool && (
        <EditSchoolModal
          school={editingSchool}
          onClose={() => setEditingSchool(null)}
          onSaved={(updated) => {
            setSchools((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            setEditingSchool(null);
          }}
        />
      )}
    </div>
  );
}

function DbStatusBadge({ status }) {
  if (!status) return <span className="badge badge-light">—</span>;
  const styles = {
    connected: { className: 'badge-success', label: 'Connecté' },
    error: { className: 'badge-danger', label: 'Erreur' },
    missing: { className: 'badge-warning', label: 'Manquant' },
  };
  const s = styles[status] || { className: 'badge-light', label: status };
  return <span className={`badge ${s.className}`}>{s.label}</span>;
}

function EditSchoolModal({ school, onClose, onSaved }) {
  const [form, setForm] = useState({
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
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSchool(school.id)
      .then((data) => {
        setForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          directeur_first_name: data.directeur?.first_name || '',
          directeur_last_name: data.directeur?.last_name || '',
          directeur_email: data.directeur?.email || '',
          directeur_phone: data.directeur?.phone || '',
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingData(false));
  }, [school.id]);

  const REQUIRED_FIELDS = new Set([
    'name', 'email', 'phone', 'address', 'city', 'postal_code',
    'directeur_first_name',
  ]);

  const FIELD_LABELS = {
    name: 'Nom établissement',
    email: 'Email établissement',
    phone: 'Téléphone établissement',
    address: 'Adresse',
    city: 'Ville',
    postal_code: 'Code postal',
    directeur_first_name: 'Nom directeur',
    directeur_last_name: 'Prénom directeur',
    directeur_email: 'Email directeur',
    directeur_phone: 'Téléphone directeur',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const updated = await api.updateSchool(school.id, form);
      onSaved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Modifier — {school.name}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="school-form">
          {error && <div className="form-error">{error}</div>}
          {loadingData ? (
            <div className="sa-empty">Chargement...</div>
          ) : ['name', 'email', 'phone', 'address', 'city', 'postal_code', 'directeur_first_name', 'directeur_last_name', 'directeur_email', 'directeur_phone'].map((field) => (
            <div key={field} className="form-group">
              <label>{FIELD_LABELS[field]}{REQUIRED_FIELDS.has(field) ? ' *' : ''}</label>
              {field === 'city' ? (
                <CitySelect
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  required={REQUIRED_FIELDS.has(field)}
                />
              ) : (
                <input
                  type={field.includes('email') ? 'email' : field === 'phone' || field.includes('phone') ? 'tel' : 'text'}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  required={REQUIRED_FIELDS.has(field)}
                />
              )}
            </div>
          ))}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
