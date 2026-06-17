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
    description: '',
    groupe: 1,
    coefficient_defaut: 1,
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
    const parsed =
      name === 'groupe'
        ? parseInt(value, 10)
        : name === 'coefficient_defaut'
          ? parseFloat(value)
          : value;
    setFormData((prev) => ({ ...prev, [name]: parsed }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.createMatiere({
        ...formData,
        groupe: Number(formData.groupe) || 1,
        coefficient_defaut: Number(formData.coefficient_defaut) || 1,
      });
      setFormData({ nom: '', code: '', description: '', groupe: 1, coefficient_defaut: 1 });
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
      alert(error.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Gestion des matières</h3>
          <div className="card-tools">
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateForm(!showCreateForm)}>
              <i className="fas fa-plus mr-1" />
              Ajouter
            </button>
          </div>
        </div>
        <div className="card-body">
          <p className="text-muted mb-0">Chaque matière a un groupe bulletin (1-3) et un coefficient.</p>
        </div>
      </div>

      {showCreateForm && (
        <form onSubmit={handleSubmit} className="card">
          <div className="card-body">
            <div className="form-row">
              <div className="form-group col-md-6">
                <label>Nom *</label>
                <input
                  className="form-control"
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleFormChange}
                  placeholder="Ex: Mathématiques"
                  required
                />
              </div>
              <div className="form-group col-md-6">
                <label>Code *</label>
                <input
                  className="form-control"
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleFormChange}
                  placeholder="Ex: MATH"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group col-md-6">
                <label>Groupe bulletin</label>
                <select className="form-control" name="groupe" value={formData.groupe} onChange={handleFormChange}>
                  <option value={1}>1 — Premier groupe</option>
                  <option value={2}>2 — Deuxième groupe</option>
                  <option value={3}>3 — Troisième groupe</option>
                </select>
              </div>
              <div className="form-group col-md-6">
                <label>Coefficient</label>
                <input
                  className="form-control"
                  type="number"
                  name="coefficient_defaut"
                  min="0.5"
                  step="0.5"
                  value={formData.coefficient_defaut}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-control"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Description optionnelle"
              />
            </div>
          </div>
          <div className="card-footer">
            <button type="submit" className="btn btn-primary btn-sm">Créer</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateForm(false)}>Annuler</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="card"><div className="card-body text-muted">Chargement...</div></div>
      ) : matieres.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="fas fa-book-open fa-2x text-muted mb-3" />
            <p className="text-muted mb-0">Aucune matière créée</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body table-responsive p-0">
            <table className="table table-hover text-nowrap mb-0">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Code</th>
                  <th>Groupe</th>
                  <th>Coefficient</th>
                  <th>Description</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {matieres.map((matiere) => (
                  <tr key={matiere.id}>
                    <td><strong>{matiere.nom}</strong></td>
                    <td><code>{matiere.code}</code></td>
                    <td>{matiere.groupe ?? 1}</td>
                    <td>{matiere.coefficient_defaut ?? 1}</td>
                    <td>{matiere.description || '—'}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(matiere.id)}
                      >
                        <i className="fas fa-trash" />
                      </button>
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
