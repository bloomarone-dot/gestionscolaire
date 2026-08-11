import { useState, useEffect, useCallback } from 'react';
import CreateProfesseurModal from './CreateProfesseurModal';
import EditProfesseurModal from './EditProfesseurModal';
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
  const [showEditModal, setShowEditModal] = useState(false);
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
    <div>
      {loading ? (
        <div className="card"><div className="card-body text-muted">Chargement...</div></div>
      ) : professeurs.length === 0 ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Gestion des professeurs</h3>
            <div className="card-tools">
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                <i className="fas fa-plus mr-1" />
                Ajouter
              </button>
            </div>
          </div>
          <div className="card-body text-center py-5">
            <i className="fas fa-chalkboard-teacher fa-2x text-muted mb-3" />
            <h3 className="h5">Aucun professeur</h3>
            <p className="text-muted mb-0">Commencez par ajouter votre premier professeur</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Gestion des professeurs</h3>
            <div className="card-tools">
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
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
                  <th>Identifiant</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Spécialité</th>
                  <th>Section</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {professeurs.map((prof) => (
                  <tr key={prof.id}>
                    <td><strong>{prof.prenom} {prof.nom}</strong></td>
                    <td><code>{prof.username || prof.matricule || prof.phone}</code></td>
                    <td>{formatEmail(prof.email)}</td>
                    <td>{prof.phone || '—'}{prof.phone2 ? <small className="d-block text-muted">{prof.phone2}</small> : null}</td>
                    <td>{prof.specialite || '—'}</td>
                    <td>{getSectionLabel(prof.section || 'francophone')}</td>
                    <td>
                      <span className={`badge ${prof.is_active ? 'badge-success' : 'badge-secondary'}`}>
                        {prof.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-default"
                          title="Modifier"
                          onClick={() => {
                            setSelectedProf(prof);
                            setShowEditModal(true);
                          }}
                        >
                          <i className="fas fa-edit" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-default"
                          title="Réinitialiser identifiants"
                          onClick={() => {
                            setSelectedProf(prof);
                            setShowResetModal(true);
                          }}
                        >
                          <i className="fas fa-key" />
                        </button>
                        <button
                          className="btn btn-default"
                          title="Attribuer classe/matière"
                          onClick={() => {
                            setSelectedProf(prof);
                            setShowAttributeModal(true);
                          }}
                        >
                          <i className="fas fa-link" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          title="Supprimer"
                          onClick={() => handleDelete(prof.id, `${prof.prenom} ${prof.nom}`)}
                        >
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

      {showCreateModal && (
        <CreateProfesseurModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleProfesseurCreated}
        />
      )}

      {showEditModal && selectedProf && (
        <EditProfesseurModal
          professeur={selectedProf}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProf(null);
          }}
          onSaved={() => {
            setShowEditModal(false);
            setSelectedProf(null);
            loadProfesseurs();
          }}
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
