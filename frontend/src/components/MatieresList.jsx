import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/api';
import '../styles/matieres-list.css';

export default function MatieresList() {
  const [matieres, setMatieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    code: '',
    description: ''
  });

  const loadMatieres = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.fetchMatieres();
      setMatieres(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatieres();
  }, [loadMatieres]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.createMatiere(formData);
      setFormData({ nom: '', code: '', description: '' });
      setShowCreateForm(false);
      loadMatieres();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleDelete = async (matiereId) => {
    if (!window.confirm('Êtes-vous sûr ?')) return;

    try {
      await api.deleteMatiere(matiereId);
      setMatieres(matieres.filter(m => m.id !== matiereId));
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  return (
    <div className="matieres-section">
      <div className="section-header">
        <h2>Gestion des Matières</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          + Ajouter une matière
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
                placeholder="Ex: Mathématiques"
                required
              />
            </div>
            <div className="form-group">
              <label>Code *</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleFormChange}
                placeholder="Ex: MATH"
                required
              />
            </div>
          </div>

          <div className="form-group full">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              placeholder="Description optionnelle"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-sm">Créer</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateForm(false)}>Annuler</button>
          </div>
        </form>
      )}

      {loading ? (
        <div>Chargement...</div>
      ) : matieres.length === 0 ? (
        <div className="empty-state">
          <p>Aucune matière créée</p>
        </div>
      ) : (
        <div className="matieres-grid">
          {matieres.map(matiere => (
            <div key={matiere.id} className="matiere-card">
              <h3>{matiere.nom}</h3>
              <p><strong>Code:</strong> {matiere.code}</p>
              {matiere.description && <p><strong>Description:</strong> {matiere.description}</p>}
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(matiere.id)}
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
