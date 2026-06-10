import { useState, useEffect, useMemo, useCallback } from 'react';
import * as api from '../api/api';
import '../styles/eleves-list.css';

export default function ElevesList() {
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEleve, setEditingEleve] = useState(null);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [elevesData, classesData] = await Promise.all([
        api.fetchEleves_admin(),
        api.fetchClasses(),
      ]);
      setEleves(elevesData);
      setClasses(classesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filtered = useMemo(() => {
    return eleves.filter((e) => {
      const matchSearch =
        !search ||
        e.nom.toLowerCase().includes(search.toLowerCase()) ||
        e.prenom.toLowerCase().includes(search.toLowerCase()) ||
        e.matricule.toLowerCase().includes(search.toLowerCase());
      const matchClasse = !filterClasse || String(e.classe_id) === filterClasse;
      return matchSearch && matchClasse;
    });
  }, [eleves, search, filterClasse]);

  const handleDelete = async (eleveId, name) => {
    if (!window.confirm(`Supprimer "${name}" ?`)) return;
    try {
      await api.deleteEleve_admin(eleveId);
      setEleves((prev) => prev.filter((e) => e.id !== eleveId));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="eleves-section">
      <div className="section-header">
        <div>
          <h2>Gestion des Élèves</h2>
          <span className="eleves-count">{eleves.length} élève{eleves.length !== 1 ? 's' : ''}</span>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingEleve(null); setShowModal(true); }}>
          + Ajouter un élève
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="eleves-toolbar">
        <input
          type="search"
          className="eleves-search"
          placeholder="Rechercher par nom, prénom, matricule..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="eleves-filter"
          value={filterClasse}
          onChange={(e) => setFilterClasse(e.target.value)}
        >
          <option value="">Toutes les classes</option>
          {classes.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.nom} ({c.niveau})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>Aucun élève trouvé</h3>
          <p>{search || filterClasse ? 'Modifiez vos filtres' : 'Commencez par inscrire le premier élève'}</p>
          {!search && !filterClasse && (
            <button className="btn btn-primary" onClick={() => { setEditingEleve(null); setShowModal(true); }}>
              Inscrire un élève
            </button>
          )}
        </div>
      ) : (
        <div className="eleves-table-wrap">
          <table className="eleves-table">
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Classe</th>
                <th>Date d'inscription</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((eleve) => (
                <tr key={eleve.id}>
                  <td><code>{eleve.matricule}</code></td>
                  <td><strong>{eleve.nom}</strong></td>
                  <td>{eleve.prenom}</td>
                  <td>
                    {eleve.classe_nom ? (
                      <span className="classe-badge">{eleve.classe_nom}</span>
                    ) : (
                      <span className="no-classe">Non assigné</span>
                    )}
                  </td>
                  <td>{new Date(eleve.date_inscription).toLocaleDateString('fr-FR')}</td>
                  <td className="actions-cell">
                    <button
                      className="action-btn edit-btn"
                      title="Modifier"
                      onClick={() => { setEditingEleve(eleve); setShowModal(true); }}
                    >
                      ✏️
                    </button>
                    <button
                      className="action-btn delete-btn"
                      title="Supprimer"
                      onClick={() => handleDelete(eleve.id, `${eleve.prenom} ${eleve.nom}`)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <EleveModal
          eleve={editingEleve}
          classes={classes}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadAll(); }}
        />
      )}
    </div>
  );
}

function EleveModal({ eleve, classes, onClose, onSaved }) {
  const isEdit = !!eleve;
  const [form, setForm] = useState({
    nom: eleve?.nom || '',
    prenom: eleve?.prenom || '',
    matricule: eleve?.matricule || '',
    classe_id: eleve?.classe_id ? String(eleve.classe_id) : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        classe_id: form.classe_id ? parseInt(form.classe_id) : null,
      };
      if (isEdit) {
        await api.updateEleve_admin(eleve.id, {
          nom: payload.nom,
          prenom: payload.prenom,
          classe_id: payload.classe_id,
        });
      } else {
        await api.createEleve_admin(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? `Modifier — ${eleve.prenom} ${eleve.nom}` : 'Inscrire un élève'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="school-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>Nom *</label>
              <input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
                placeholder="Nom de famille"
              />
            </div>
            <div className="form-group">
              <label>Prénom *</label>
              <input
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                required
                placeholder="Prénom"
              />
            </div>
          </div>

          {!isEdit && (
            <div className="form-group">
              <label>Matricule *</label>
              <input
                value={form.matricule}
                onChange={(e) => setForm({ ...form, matricule: e.target.value })}
                required
                placeholder="Ex: EL-2024-001"
              />
            </div>
          )}

          <div className="form-group">
            <label>Classe</label>
            <select
              value={form.classe_id}
              onChange={(e) => setForm({ ...form, classe_id: e.target.value })}
            >
              <option value="">— Aucune classe —</option>
              {classes.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nom} ({c.niveau})
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Inscrire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
