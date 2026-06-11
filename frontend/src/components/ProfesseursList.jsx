import { useState, useEffect, useCallback } from 'react';
import CreateProfesseurModal from './CreateProfesseurModal';
import ResetCredentialsModal from './ResetCredentialsModal';
import { getSectionLabel } from '../utils/sections';
import AttributeProfesseurModal from './AttributeProfesseurModal';
import * as api from '../api/api';
import '../styles/professeurs-list.css';

function formatEmail(email) {
  return email?.includes('@edusaas.local') ? '—' : (email || '—');
}

export default function ProfesseursList() {
  const [professeurs, setProfesseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAttributeModal, setShowAttributeModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedProf, setSelectedProf] = useState(null);

  const loadProfesseurs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.fetchProfesseurs();
      setProfesseurs(data);
    } catch (error) {
      console.error('Erreur chargement professeurs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfesseurs();
  }, [loadProfesseurs]);

  const handleProfesseurCreated = () => {
    setShowCreateModal(false);
    loadProfesseurs();
  };

  const handleDelete = async (profId, profName) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${profName}" ?`)) {
      return;
    }

    try {
      await api.deleteProfesseur(profId);
      setProfesseurs(professeurs.filter(p => p.id !== profId));
    } catch (error) {
      alert(error.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="professeurs-section">
      <div className="section-header">
        <h2>Gestion des Professeurs</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Ajouter un professeur
        </button>
      </div>

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : professeurs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👨‍🏫</div>
          <h3>Aucun professeur</h3>
          <p>Commencez par ajouter votre premier professeur</p>
        </div>
      ) : (
        <div className="professeurs-grid">
          {professeurs.map(prof => (
            <div key={prof.id} className="prof-card">
              <div className="prof-header">
                <h3>{prof.prenom} {prof.nom}</h3>
                <span className={`badge ${prof.is_active ? 'active' : 'inactive'}`}>
                  {prof.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <div className="prof-info">
                <p><strong>Matricule:</strong> {prof.matricule}</p>
                <p><strong>Identifiant:</strong> {prof.username || prof.matricule}</p>
                <p><strong>Email:</strong> {formatEmail(prof.email)}</p>
                {prof.phone && <p><strong>Téléphone 1:</strong> {prof.phone}</p>}
                {prof.phone2 && <p><strong>Téléphone 2:</strong> {prof.phone2}</p>}
                {prof.specialite && <p><strong>Spécialité:</strong> {prof.specialite}</p>}
                <p><strong>Section:</strong> {getSectionLabel(prof.section || 'francophone')}</p>
              </div>

              <div className="prof-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedProf(prof);
                    setShowResetModal(true);
                  }}
                >
                  Réinitialiser identifiants
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedProf(prof);
                    setShowAttributeModal(true);
                  }}
                >
                  Attribuer classe/matière
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(prof.id, `${prof.prenom} ${prof.nom}`)}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateProfesseurModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleProfesseurCreated}
        />
      )}

      {showResetModal && selectedProf && (
        <ResetCredentialsModal
          title="Réinitialiser les identifiants"
          subtitle={`Professeur : ${selectedProf.prenom || ''} ${selectedProf.nom}`.trim()}
          currentUsername={selectedProf.username || selectedProf.matricule}
          onClose={() => {
            setShowResetModal(false);
            setSelectedProf(null);
          }}
          onSubmit={(payload) => api.resetProfesseurCredentials(selectedProf.id, payload)}
        />
      )}

      {showAttributeModal && selectedProf && (
        <AttributeProfesseurModal
          professeur={selectedProf}
          onClose={() => {
            setShowAttributeModal(false);
            setSelectedProf(null);
          }}
          onAttributed={loadProfesseurs}
        />
      )}
    </div>
  );
}
