import { useState } from 'react';
import * as api from '../api/api';
import '../styles/school-cards.css';

const EMPTY_EDIT = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postal_code: '',
};

export default function SchoolList({ schools, onSchoolDeleted, onSchoolUpdated }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(EMPTY_EDIT);
  const [error, setError] = useState('');

  const validSchools = schools.filter((school) => school?.id != null);

  const handleEdit = (school) => {
    setError('');
    setEditingId(school.id);
    setEditData({
      name: school.name || '',
      email: school.email || '',
      phone: school.phone || '',
      address: school.address || '',
      city: school.city || '',
      postal_code: school.postal_code || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData(EMPTY_EDIT);
    setError('');
  };

  const handleSave = async (schoolId) => {
    if (!schoolId) {
      setError("Impossible d'enregistrer : établissement invalide.");
      return;
    }

    try {
      setError('');
      const updatedSchool = await api.updateSchool(schoolId, editData);
      setEditingId(null);
      setEditData(EMPTY_EDIT);
      onSchoolUpdated?.(updatedSchool);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (schoolId, schoolName) => {
    if (!schoolId) {
      setError("Impossible de supprimer : établissement invalide.");
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${schoolName}" ?`)) {
      return;
    }

    try {
      setError('');
      await api.deleteSchool(schoolId);
      onSchoolDeleted(schoolId);
    } catch (err) {
      setError(err.message);
    }
  };

  if (validSchools.length === 0) {
    return null;
  }

  return (
    <div className="schools-grid">
      {error && <div className="form-error">{error}</div>}

      {validSchools.map((school) => (
        <div key={school.id} className="school-card">
          <div className="card-header">
            <div className="card-title-section">
              <h3 className="card-title">{school.name}</h3>
              <span className={`badge ${school.is_active ? 'badge-active' : 'badge-inactive'}`}>
                {school.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="card-actions">
              <button
                className="btn-icon"
                title="Modifier"
                onClick={() => handleEdit(school)}
              >
                ✏️
              </button>
              <button
                className="btn-icon btn-danger"
                title="Supprimer"
                onClick={() => handleDelete(school.id, school.name)}
              >
                🗑️
              </button>
            </div>
          </div>

          {editingId === school.id ? (
            <div className="card-edit-form">
              <div className="form-group">
                <label>Nom</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Adresse</label>
                <input
                  type="text"
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Ville</label>
                <input
                  type="text"
                  value={editData.city}
                  onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Code postal</label>
                <input
                  type="text"
                  value={editData.postal_code}
                  onChange={(e) => setEditData({ ...editData, postal_code: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" onClick={() => handleSave(school.id)}>
                  Enregistrer
                </button>
                <button className="btn btn-secondary" onClick={handleCancelEdit}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">Email</span>
                <span className="info-value">{school.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Téléphone</span>
                <span className="info-value">{school.phone}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Adresse</span>
                <span className="info-value">{school.address}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Ville</span>
                <span className="info-value">{school.city}</span>
              </div>
              <div className="info-row">
                <span className="info-label">DB</span>
                <span className="info-value code">{school.db_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Créé le</span>
                <span className="info-value">
                  {school.created_at
                    ? new Date(school.created_at).toLocaleDateString('fr-FR')
                    : '—'}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
