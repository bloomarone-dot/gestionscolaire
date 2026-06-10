import { useState } from 'react';
import * as api from '../api/api';
import '../styles/create-school-modal.css';

export default function CreateSchoolModal({ onClose, onSchoolCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    directeur_first_name: '',
    directeur_last_name: '',
    directeur_email: '',
    directeur_phone: '',
    admin_username: '',
    admin_email: '',
    admin_password: '',
    admin_first_name: '',
    admin_last_name: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.createSchool(formData);
      onSchoolCreated(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2>Créer un nouvel établissement</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="school-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-section">
            <h3>Informations de l'établissement</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Nom de l'établissement *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Lycée Saint-Joseph"
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="contact@lycee.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Téléphone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="form-group">
                <label>Ville *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  placeholder="Paris"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Adresse *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="123 Rue de l'École"
                />
              </div>
              <div className="form-group">
                <label>Code postal *</label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  required
                  placeholder="75001"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Directeur de l'établissement</h3>
            <p className="form-section-hint">Identité du directeur (distincte du compte administrateur IT)</p>
            <div className="form-row">
              <div className="form-group">
                <label>Prénom *</label>
                <input
                  type="text"
                  name="directeur_first_name"
                  value={formData.directeur_first_name}
                  onChange={handleChange}
                  required
                  placeholder="Marie"
                />
              </div>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  name="directeur_last_name"
                  value={formData.directeur_last_name}
                  onChange={handleChange}
                  required
                  placeholder="Martin"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="directeur_email"
                  value={formData.directeur_email}
                  onChange={handleChange}
                  placeholder="directeur@lycee.com"
                />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  name="directeur_phone"
                  value={formData.directeur_phone}
                  onChange={handleChange}
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Administrateur IT de l'établissement</h3>
            <p className="form-section-hint">Compte de connexion pour la gestion de la plateforme</p>
            <div className="form-row">
              <div className="form-group">
                <label>Prénom *</label>
                <input
                  type="text"
                  name="admin_first_name"
                  value={formData.admin_first_name}
                  onChange={handleChange}
                  required
                  placeholder="Jean"
                />
              </div>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  name="admin_last_name"
                  value={formData.admin_last_name}
                  onChange={handleChange}
                  required
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nom d'utilisateur *</label>
                <input
                  type="text"
                  name="admin_username"
                  value={formData.admin_username}
                  onChange={handleChange}
                  required
                  placeholder="admin_lycee"
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="admin_email"
                  value={formData.admin_email}
                  onChange={handleChange}
                  required
                  placeholder="admin@lycee.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Mot de passe *</label>
                <input
                  type="password"
                  name="admin_password"
                  value={formData.admin_password}
                  onChange={handleChange}
                  required
                  placeholder="Minimum 8 caractères"
                  minLength="8"
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Création en cours...' : 'Créer l\'établissement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
