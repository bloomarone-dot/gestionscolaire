import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/api';
import { formatLocalDate, toDateInputValue } from '../utils/dates';

const STATUT_BADGE = {
  ouverte: 'badge-green',
  a_venir: 'badge-orange',
  expiree: 'badge-red',
};
import '../styles/admin-notes.css';

const SCOPE_OPTIONS = [
  { value: 'single', label: 'Une classe + une matière' },
  { value: 'classe_all_matieres', label: 'Une classe — toutes les matières' },
  { value: 'matiere_all_classes', label: 'Une matière — toutes les classes' },
  { value: 'all', label: 'Toutes les classes et toutes les matières' },
];

export default function AdminPeriodeSaisiePage() {
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [periodes, setPeriodes] = useState([]);
  const [serverDate, setServerDate] = useState(null);
  const [filterClasseId, setFilterClasseId] = useState('');
  const [filterMatiereId, setFilterMatiereId] = useState('');
  const [scope, setScope] = useState('single');
  const [selectedClasseId, setSelectedClasseId] = useState('');
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ date_debut: '', date_fin: '' });

  const loadPeriodes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.fetchPeriodesSaisie(
        filterClasseId ? Number(filterClasseId) : null,
        filterMatiereId ? Number(filterMatiereId) : null,
      );
      setPeriodes(data.items || []);
      setServerDate(data.server_date || null);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des périodes');
    } finally {
      setLoading(false);
    }
  }, [filterClasseId, filterMatiereId]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [classesData, matieresData] = await Promise.all([
          api.fetchClasses(),
          api.fetchMatieres(),
        ]);
        setClasses(classesData || []);
        setMatieres(matieresData || []);
      } catch (err) {
        setError(err.message || 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    loadPeriodes();
  }, [loadPeriodes]);

  useEffect(() => {
    if (editingId) return;
    const today = new Date();
    const fin = new Date(today);
    fin.setDate(fin.getDate() + 30);
    setForm({
      date_debut: toDateInputValue(today),
      date_fin: toDateInputValue(fin),
    });
  }, [scope, selectedClasseId, selectedMatiereId, editingId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (periode) => {
    setEditingId(periode.id);
    setScope('single');
    setSelectedClasseId(String(periode.classe_id));
    setSelectedMatiereId(String(periode.matiere_id));
    setForm({
      date_debut: String(periode.date_debut).split('T')[0],
      date_fin: String(periode.date_fin).split('T')[0],
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setScope('single');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date_debut || !form.date_fin) {
      setError('Les deux dates sont obligatoires');
      return;
    }
    if (form.date_fin < form.date_debut) {
      setError('La date de fin doit être postérieure ou égale à la date de début');
      return;
    }

    if (scope === 'single' && (!selectedClasseId || !selectedMatiereId)) {
      setError('Sélectionnez une classe et une matière');
      return;
    }
    if (scope === 'classe_all_matieres' && !selectedClasseId) {
      setError('Sélectionnez une classe');
      return;
    }
    if (scope === 'matiere_all_classes' && !selectedMatiereId) {
      setError('Sélectionnez une matière');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (editingId) {
        await api.createPeriodeSaisie({
          classe_id: Number(selectedClasseId),
          matiere_id: Number(selectedMatiereId),
          date_debut: form.date_debut,
          date_fin: form.date_fin,
          justification_autorisee: false,
        });
        setSuccess('Délai mis à jour');
      } else {
        const result = await api.createPeriodesBulk({
          scope,
          classe_id: selectedClasseId ? Number(selectedClasseId) : null,
          matiere_id: selectedMatiereId ? Number(selectedMatiereId) : null,
          date_debut: form.date_debut,
          date_fin: form.date_fin,
          justification_autorisee: false,
        });
        setSuccess(
          `${result.total} délai(s) enregistré(s) (${result.created} nouveau(x), ${result.updated} mis à jour)`,
        );
      }

      handleCancel();
      await loadPeriodes();
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (periodeId) => {
    if (!window.confirm('Supprimer ce délai de saisie ?')) return;
    try {
      setError('');
      setSuccess('');
      await api.deletePeriodeSaisie(periodeId);
      setSuccess('Délai supprimé');
      await loadPeriodes();
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  const classeLabel = (id) => classes.find((item) => item.id === id)?.nom || '—';
  const matiereLabel = (id) => matieres.find((item) => item.id === id)?.nom || '—';

  const showClasseSelect = scope === 'single' || scope === 'classe_all_matieres';
  const showMatiereSelect = scope === 'single' || scope === 'matiere_all_classes';

  return (
    <div className="admin-periode-page">
      <header className="section-header">
        <h2>Délais de saisie des notes</h2>
        <p>
          Un délai par couple <strong>classe + matière</strong>. Utilisez la création groupée pour ouvrir
          la saisie sur plusieurs classes ou matières en une seule opération.
          La date de début doit être <strong>aujourd&apos;hui ou avant</strong>.
        </p>
      </header>

      <div className="admin-periode-filters form-row">
        <div className="form-group">
          <label htmlFor="filter-classe">Filtrer par classe</label>
          <select id="filter-classe" value={filterClasseId} onChange={(e) => setFilterClasseId(e.target.value)}>
            <option value="">Toutes les classes</option>
            {classes.map((classe) => (
              <option key={classe.id} value={classe.id}>{classe.nom} ({classe.niveau})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="filter-matiere">Filtrer par matière</label>
          <select id="filter-matiere" value={filterMatiereId} onChange={(e) => setFilterMatiereId(e.target.value)}>
            <option value="">Toutes les matières</option>
            {matieres.map((matiere) => (
              <option key={matiere.id} value={matiere.id}>{matiere.nom}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form className="periode-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="periode-scope">Portée du délai</label>
          <select
            id="periode-scope"
            value={scope}
            disabled={!!editingId}
            onChange={(e) => setScope(e.target.value)}
          >
            {SCOPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="admin-periode-filters form-row">
          {showClasseSelect && (
            <div className="form-group">
              <label htmlFor="periode-classe">Classe</label>
              <select
                id="periode-classe"
                value={selectedClasseId}
                onChange={(e) => setSelectedClasseId(e.target.value)}
              >
                <option value="">— Choisir —</option>
                {classes.map((classe) => (
                  <option key={classe.id} value={classe.id}>{classe.nom} ({classe.niveau})</option>
                ))}
              </select>
            </div>
          )}
          {showMatiereSelect && (
            <div className="form-group">
              <label htmlFor="periode-matiere">Matière</label>
              <select
                id="periode-matiere"
                value={selectedMatiereId}
                onChange={(e) => setSelectedMatiereId(e.target.value)}
              >
                <option value="">— Choisir —</option>
                {matieres.map((matiere) => (
                  <option key={matiere.id} value={matiere.id}>{matiere.nom}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date_debut">Date de début *</label>
            <input id="date_debut" type="date" name="date_debut" value={form.date_debut} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="date_fin">Date limite (échéance) *</label>
            <input id="date_fin" type="date" name="date_fin" value={form.date_fin} onChange={handleChange} required />
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 12 }}>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>Annuler</button>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Créer les délais'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <div className="periode-table-wrap">
          <p className="admin-notes-intro" style={{ margin: '1rem 0 0.5rem' }}>
            {periodes.length} délai{periodes.length !== 1 ? 's' : ''} configuré{periodes.length !== 1 ? 's' : ''}
            {serverDate && (
              <> — date serveur : <strong>{formatLocalDate(serverDate)}</strong></>
            )}
          </p>
          <table className="admin-notes-table">
            <thead>
              <tr>
                <th>Classe</th>
                <th>Matière</th>
                <th>Début</th>
                <th>Échéance</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {periodes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    Aucun délai configuré — créez-en un ci-dessus
                  </td>
                </tr>
              ) : (
                periodes.map((periode) => {
                  const badgeClass = STATUT_BADGE[periode.statut] || 'badge-orange';
                  const statusLabel = periode.statut_label || 'Inconnue';
                  return (
                    <tr key={periode.id}>
                      <td>{classeLabel(periode.classe_id)}</td>
                      <td>{matiereLabel(periode.matiere_id)}</td>
                      <td>{formatLocalDate(periode.date_debut)}</td>
                      <td><strong>{formatLocalDate(periode.date_fin)}</strong></td>
                      <td><span className={`badge ${badgeClass}`}>{statusLabel}</span></td>
                      <td>
                        <div className="note-actions">
                          <button type="button" className="btn-icon btn-edit" onClick={() => handleEdit(periode)}>✏️</button>
                          <button type="button" className="btn-icon btn-delete" onClick={() => handleDelete(periode.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
