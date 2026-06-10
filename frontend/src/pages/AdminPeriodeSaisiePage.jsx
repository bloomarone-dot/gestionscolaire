import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/api';
import '../styles/admin-notes.css';

function getPeriodeStatus(periode) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const debut = new Date(periode.date_debut);
  const fin = new Date(periode.date_fin);
  debut.setHours(0, 0, 0, 0);
  fin.setHours(23, 59, 59, 999);
  if (today < debut) return { label: 'À venir', className: 'badge-orange' };
  if (today > fin) return { label: 'Expirée', className: 'badge-red' };
  return { label: 'Ouverte', className: 'badge-green' };
}

export default function AdminPeriodeSaisiePage() {
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [periodes, setPeriodes] = useState([]);
  const [selectedClasseId, setSelectedClasseId] = useState('');
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ date_debut: '', date_fin: '' });

  const loadPeriodes = useCallback(async () => {
    if (!selectedClasseId && !selectedMatiereId) {
      setPeriodes([]);
      return;
    }
    try {
      setLoading(true);
      const data = await api.fetchPeriodesSaisie(
        selectedClasseId ? Number(selectedClasseId) : null,
        selectedMatiereId ? Number(selectedMatiereId) : null,
      );
      setPeriodes(data || []);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des périodes');
    } finally {
      setLoading(false);
    }
  }, [selectedClasseId, selectedMatiereId]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (periode) => {
    setEditingId(periode.id);
    setSelectedClasseId(String(periode.classe_id));
    setSelectedMatiereId(String(periode.matiere_id));
    setForm({ date_debut: periode.date_debut || '', date_fin: periode.date_fin || '' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ date_debut: '', date_fin: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClasseId || !selectedMatiereId) {
      setError('Veuillez sélectionner une classe et une matière');
      return;
    }
    if (!form.date_debut || !form.date_fin) {
      setError('Les deux dates sont obligatoires');
      return;
    }
    if (form.date_fin < form.date_debut) {
      setError('La date de fin doit être postérieure à la date de début');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await api.createPeriodeSaisie({
        classe_id: Number(selectedClasseId),
        matiere_id: Number(selectedMatiereId),
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        justification_autorisee: false,
      });
      setSuccess('Délai enregistré — les professeurs pourront saisir uniquement pendant cette période');
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

  return (
    <div className="admin-periode-page">
      <header className="section-header">
        <h2>Délais de saisie des notes</h2>
        <p>
          Définissez la fenêtre pendant laquelle les professeurs peuvent saisir et modifier les notes.
          Passé le délai, la saisie est <strong>totalement verrouillée</strong> pour eux.
        </p>
      </header>

      <div className="admin-periode-filters form-row">
        <div className="form-group">
          <label htmlFor="periode-classe">Classe</label>
          <select id="periode-classe" value={selectedClasseId}
            onChange={(e) => { setSelectedClasseId(e.target.value); setEditingId(null); }}>
            <option value="">— Choisir —</option>
            {classes.map((classe) => (
              <option key={classe.id} value={classe.id}>{classe.nom} ({classe.niveau})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="periode-matiere">Matière</label>
          <select id="periode-matiere" value={selectedMatiereId}
            onChange={(e) => { setSelectedMatiereId(e.target.value); setEditingId(null); }}
            disabled={!selectedClasseId}>
            <option value="">— Choisir —</option>
            {matieres.map((matiere) => (
              <option key={matiere.id} value={matiere.id}>{matiere.nom}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {selectedClasseId && selectedMatiereId && (
        <form className="periode-form" onSubmit={handleSubmit}>
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
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour le délai' : 'Créer le délai'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <div className="periode-table-wrap">
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
                    Aucun délai configuré
                  </td>
                </tr>
              ) : (
                periodes.map((periode) => {
                  const status = getPeriodeStatus(periode);
                  return (
                    <tr key={periode.id}>
                      <td>{classeLabel(periode.classe_id)}</td>
                      <td>{matiereLabel(periode.matiere_id)}</td>
                      <td>{periode.date_debut}</td>
                      <td><strong>{periode.date_fin}</strong></td>
                      <td><span className={`badge ${status.className}`}>{status.label}</span></td>
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
