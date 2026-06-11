import { useState } from 'react';
import * as api from '../api/api';
import { PROF_SECTION_OPTIONS } from '../utils/sections';
import '../styles/modal-forms.css';

export default function EditProfesseurModal({ professeur, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    nom: professeur?.nom || '',
    prenom: professeur?.prenom || '',
    email: professeur?.email?.includes('@edusaas.local') ? '' : (professeur?.email || ''),
    phone: professeur?.phone || '',
    phone2: professeur?.phone2 || '',
    specialite: professeur?.specialite || '',
    matricule: professeur?.matricule || '',
    section: professeur?.section || 'francophone',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.nom?.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    if (!formData.phone?.trim()) {
      setError('Le téléphone 1 est obligatoire.');
      return;
    }
    if (!formData.matricule?.trim()) {
      setError('Le matricule est obligatoire.');
      return;
    }

    try {
      setLoading(true);
      await api.updateProfesseur(professeur.id, formData);
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Modifier le professeur</h2>
          <button type="button" className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Nom *</label>
                <input type="text" name="nom" value={formData.nom} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Prénom</label>
                <input type="text" name="prenom" value={formData.prenom} onChange={handleChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Téléphone 1 *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Téléphone 2</label>
                <input type="tel" name="phone2" value={formData.phone2} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Matricule *</label>
                <input type="text" name="matricule" value={formData.matricule} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Spécialité</label>
                <input type="text" name="specialite" value={formData.specialite} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Section *</label>
                <select name="section" value={formData.section} onChange={handleChange} required>
                  {PROF_SECTION_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

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
