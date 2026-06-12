import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/api';
import '../styles/classes-list.css';

const EMPTY_FORM = {
  nom: '',
  niveau: '',
  capacite: 30,
  salle: '',
  section: 'francophone',
  serie: '',
};

export default function ClassesList() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClasse, setEditingClasse] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.fetchClasses();
      setClasses(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const openCreate = () => {
    setEditingClasse(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (classe) => {
    setEditingClasse(classe);
    setFormData({
      nom: classe.nom || '',
      niveau: classe.niveau || '',
      capacite: classe.capacite || 30,
      salle: classe.salle || '',
      section: classe.section || 'francophone',
      serie: classe.serie || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingClasse(null);
    setFormData(EMPTY_FORM);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingClasse) {
        await api.updateClasse(editingClasse.id, formData);
      } else {
        await api.createClasse(formData);
      }
      closeForm();
      loadClasses();
    } catch (error) {
      alert(error.message || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (classeId) => {
    if (!window.confirm('Êtes-vous sûr ?')) return;

    try {
      await api.deleteClasse(classeId);
      setClasses(classes.filter((c) => c.id !== classeId));
    } catch (error) {
      alert(error.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <div>
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingClasse ? `Modifier — ${editingClasse.nom}` : 'Nouvelle classe'}</h2>
              <button type="button" className="close-btn" onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="school-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nom *</label>
                  <input type="text" name="nom" value={formData.nom} onChange={handleFormChange} placeholder="Ex: 6A, 1S" required />
                </div>
                <div className="form-group">
                  <label>Niveau *</label>
                  <input type="text" name="niveau" value={formData.niveau} onChange={handleFormChange} placeholder="Ex: 6ème, 1ère" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Capacité</label>
                  <input type="number" name="capacite" value={formData.capacite} onChange={handleFormChange} />
                </div>
                <div className="form-group">
                  <label>Salle</label>
                  <input type="text" name="salle" value={formData.salle} onChange={handleFormChange} placeholder="Ex: Salle 101" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Section</label>
                  <select name="section" value={formData.section} onChange={handleFormChange}>
                    <option value="francophone">Francophone</option>
                    <option value="anglophone">Anglophone</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Série</label>
                  <input type="text" name="serie" value={formData.serie} onChange={handleFormChange} placeholder="Ex: ESP, MM" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">{editingClasse ? 'Enregistrer' : 'Créer'}</button>
                <button type="button" className="btn btn-secondary" onClick={closeForm}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card"><div className="card-body text-muted">Chargement...</div></div>
      ) : classes.length === 0 ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Gestion des classes</h3>
            <div className="card-tools">
              <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
                <i className="fas fa-plus mr-1" />
                Ajouter
              </button>
            </div>
          </div>
          <div className="card-body text-center py-5">
            <i className="fas fa-book fa-2x text-muted mb-3" />
            <p className="text-muted mb-0">Aucune classe créée</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Gestion des classes</h3>
            <div className="card-tools">
              <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
                <i className="fas fa-plus mr-1" />
                Ajouter
              </button>
            </div>
          </div>
          <div className="card-body table-responsive p-0">
            <table className="table table-hover text-nowrap mb-0">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Niveau</th>
                  <th>Capacité</th>
                  <th>Section</th>
                  <th>Salle</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((classe) => (
                  <tr key={classe.id}>
                    <td><strong>{classe.nom}</strong></td>
                    <td>{classe.niveau || '—'}</td>
                    <td>{classe.capacite || '—'}</td>
                    <td>
                      <span className="badge badge-info">
                        {classe.section === 'anglophone' ? 'Anglophone' : 'Francophone'}
                      </span>
                      {classe.serie ? <small className="ml-2 text-muted">{classe.serie}</small> : null}
                    </td>
                    <td>{classe.salle || '—'}</td>
                    <td className="text-right">
                      <div className="btn-group btn-group-sm">
                        <button type="button" className="btn btn-default" title="Modifier" onClick={() => openEdit(classe)}>
                          <i className="fas fa-edit" />
                        </button>
                        <button type="button" className="btn btn-danger" title="Supprimer" onClick={() => handleDelete(classe.id)}>
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </td>
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
