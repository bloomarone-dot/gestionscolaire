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
      <div className="sa-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="sa-page-title">Établissements</h1>
          <p className="sa-page-subtitle">Créer, consulter et gérer tous les établissements</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Créer un établissement
        </button>
      </div>

      <div className="sa-toolbar">
        <input
          type="search"
          className="sa-search"
          placeholder="Rechercher par nom, ville, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="sa-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="inactive">Inactifs</option>
        </select>
      </div>

      {loading ? (
        <div className="sa-empty">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="sa-empty">
          <p>Aucun établissement trouvé</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Créer le premier établissement
          </button>
        </div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((school) => (
                <tr key={school.id}>
                  <td><strong>{school.name}</strong></td>
                  <td>{school.city}</td>
                  <td>{school.email}</td>
                  <td>{school.phone}</td>
                  <td><code>{school.db_name}</code></td>
                  <td>
                    <DbStatusBadge status={school.db_status} />
                  </td>
                  <td>
                    <span className={`sa-badge ${school.is_active ? 'sa-badge-active' : 'sa-badge-inactive'}`}>
                      {school.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td>{new Date(school.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <button className="sa-action-btn" title="Détails" onClick={() => setDetailSchoolId(school.id)}>👁️</button>
                    <button className="sa-action-btn" title="Modifier" onClick={() => setEditingSchool(school)}>✏️</button>
                    <button className="sa-action-btn" title="Supprimer" onClick={() => handleDelete(school.id, school.name)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  if (!status) return <span className="sa-badge">—</span>;
  const styles = {
    connected: { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', label: 'Connecté' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', label: 'Erreur' },
    missing: { bg: 'rgba(251, 146, 60, 0.15)', color: '#fb923c', label: 'Manquant' },
  };
  const s = styles[status] || { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', label: status };
  return (
    <span
      className="sa-badge"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
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
