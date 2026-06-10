import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/api';
import '../styles/modal-forms.css';

export default function AttributeProfesseurModal({ professeur, onClose, onAttributed }) {
  const [formData, setFormData] = useState({
    classe_id: '',
    matiere_id: ''
  });

  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [classesData, matieresData] = await Promise.all([
        api.fetchClasses(),
        api.fetchMatieres(),
      ]);
      setClasses(classesData);
      setMatieres(matieresData);
    } catch (err) {
      console.error('Erreur chargement:', err);
      setError(err.message || 'Erreur lors du chargement');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.createAttribution({
        professeur_id: professeur.id,
        classe_id: parseInt(formData.classe_id, 10),
        matiere_id: parseInt(formData.matiere_id, 10),
      });

      onAttributed();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-md">
        <div className="modal-header">
          <h2>Attribuer {professeur.prenom} {professeur.nom}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label>Classe *</label>
            <select
              name="classe_id"
              value={formData.classe_id}
              onChange={handleChange}
              required
            >
              <option value="">Sélectionner une classe...</option>
              {classes.map(classe => (
                <option key={classe.id} value={classe.id}>
                  {classe.nom} ({classe.niveau})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Matière *</label>
            <select
              name="matiere_id"
              value={formData.matiere_id}
              onChange={handleChange}
              required
            >
              <option value="">Sélectionner une matière...</option>
              {matieres.map(matiere => (
                <option key={matiere.id} value={matiere.id}>
                  {matiere.nom} ({matiere.code})
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Attribution...' : 'Attribuer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
