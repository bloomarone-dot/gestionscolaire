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
    <div className="classes-section">
      <div className="section-header">
        <div>
          <h2>Gestion des Classes</h2>
          <p className="form-section-hint">Définissez la <strong>section</strong> (francophone / anglophone) pour le bulletin PDF.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + Ajouter une classe
        </button>
      </div>

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
        <div>Chargement...</div>
      ) : classes.length === 0 ? (
        <div className="empty-state">
          <p>Aucune classe créée</p>
        </div>
      ) : (
        <div className="classes-grid">
          {classes.map((classe) => (
            <div key={classe.id} className="classe-card">
              <h3>{classe.nom}</h3>
              <p><strong>Niveau:</strong> {classe.niveau}</p>
              <p><strong>Capacité:</strong> {classe.capacite}</p>
              <p>
                <strong>Section:</strong>{' '}
                {classe.section === 'anglophone' ? 'Anglophone' : 'Francophone'}
                {classe.serie ? ` · ${classe.serie}` : ''}
              </p>
              {classe.salle && <p><strong>Salle:</strong> {classe.salle}</p>}
              <div className="classe-card-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(classe)}>
                  Modifier
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(classe.id)}>
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
