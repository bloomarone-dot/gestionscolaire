import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/api';
import '../styles/classes-list.css';

export default function ClassesList() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    niveau: '',
    capacite: 30,
    salle: '',
    section: 'francophone',
    serie: '',
  });

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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.createClasse(formData);
      setFormData({ nom: '', niveau: '', capacite: 30, salle: '', section: 'francophone', serie: '' });
      setShowCreateForm(false);
      loadClasses();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleDelete = async (classeId) => {
    if (!window.confirm('Êtes-vous sûr ?')) return;

    try {
      await api.deleteClasse(classeId);
      setClasses(classes.filter(c => c.id !== classeId));
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
        <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          + Ajouter une classe
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-row">
            <div className="form-group">
              <label>Nom *</label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleFormChange}
                placeholder="Ex: 6A, 1S"
                required
              />
            </div>
            <div className="form-group">
              <label>Niveau *</label>
              <input
                type="text"
                name="niveau"
                value={formData.niveau}
                onChange={handleFormChange}
                placeholder="Ex: 6ème, 1ère"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Capacité</label>
              <input
                type="number"
                name="capacite"
                value={formData.capacite}
                onChange={handleFormChange}
              />
            </div>
            <div className="form-group">
              <label>Salle</label>
              <input
                type="text"
                name="salle"
                value={formData.salle}
                onChange={handleFormChange}
                placeholder="Ex: Salle 101"
              />
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
              <input
                type="text"
                name="serie"
                value={formData.serie}
                onChange={handleFormChange}
                placeholder="Ex: ESP, MM"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-sm">Créer</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateForm(false)}>Annuler</button>
          </div>
        </form>
      )}

      {loading ? (
        <div>Chargement...</div>
      ) : classes.length === 0 ? (
        <div className="empty-state">
          <p>Aucune classe créée</p>
        </div>
      ) : (
        <div className="classes-grid">
          {classes.map(classe => (
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
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(classe.id)}
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
