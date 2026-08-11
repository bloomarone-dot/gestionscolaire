import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/api';
import SchoolDbConfigPanel from './SchoolDbConfigPanel';

export default function SchoolDetailModal({ schoolId, onClose, onSchoolUpdated }) {
  const [school, setSchool] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [toggling, setToggling] = useState(false);

  const loadSchool = useCallback(async () => {
    try {
      const [schoolData, statsData] = await Promise.all([
        api.getSchool(schoolId),
        api.getSchoolStats(schoolId),
      ]);
      setSchool(schoolData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadSchool();
  }, [loadSchool]);

  const handleToggleActive = async () => {
    setToggling(true);
    try {
      const result = await api.toggleSchoolActive(schoolId);
      setSchool((prev) => ({ ...prev, is_active: result.is_active }));
      if (onSchoolUpdated) onSchoolUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setToggling(false);
    }
  };

  const tabs = [
    { id: 'info', label: '📋 Informations' },
    { id: 'stats', label: '📊 Statistiques' },
    { id: 'db', label: '🗄️ Base de données' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{school?.name || 'Détails établissement'}</h2>
            {school && (
              <span className={`sa-badge ${school.is_active ? 'sa-badge-active' : 'sa-badge-inactive'}`}>
                {school.is_active ? 'Actif' : 'Inactif'}
              </span>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Onglets */}
        <div className="detail-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`detail-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {loading && <div className="sa-empty">Chargement...</div>}
          {error && <div className="form-error">{error}</div>}

          {school && activeTab === 'info' && (
            <div className="school-form">
              <div className="form-section">
                <h3>Informations générales</h3>
                <div className="info-row"><span className="info-label">Nom</span><span>{school.name}</span></div>
                <div className="info-row"><span className="info-label">Email</span><span>{school.email}</span></div>
                <div className="info-row"><span className="info-label">Téléphone</span><span>{school.phone}</span></div>
                <div className="info-row"><span className="info-label">Adresse</span><span>{school.address}</span></div>
                <div className="info-row"><span className="info-label">Ville</span><span>{school.city} ({school.postal_code})</span></div>
                <div className="info-row">
                  <span className="info-label">Créé le</span>
                  <span>{new Date(school.created_at).toLocaleString('fr-FR')}</span>
                </div>
              </div>

              <div className="form-section">
                <h3>Directeur</h3>
                {school.directeur ? (
                  <>
                    <div className="info-row"><span className="info-label">Nom complet</span><span>{school.directeur.first_name} {school.directeur.last_name}</span></div>
                    {school.directeur.email && (
                      <div className="info-row"><span className="info-label">Email</span><span>{school.directeur.email}</span></div>
                    )}
                    {school.directeur.phone && (
                      <div className="info-row"><span className="info-label">Téléphone</span><span>{school.directeur.phone}</span></div>
                    )}
                  </>
                ) : (
                  <p className="sa-empty" style={{ padding: '1rem 0', textAlign: 'left' }}>Directeur non renseigné</p>
                )}
              </div>

              <div className="form-section">
                <h3>Administrateur IT assigné</h3>
                {school.admin ? (
                  <>
                    <div className="info-row"><span className="info-label">Nom complet</span><span>{school.admin.first_name} {school.admin.last_name}</span></div>
                    <div className="info-row"><span className="info-label">Username</span><span>{school.admin.username}</span></div>
                    <div className="info-row"><span className="info-label">Email</span><span>{school.admin.email}</span></div>
                  </>
                ) : (
                  <p className="sa-empty" style={{ padding: '1rem 0', textAlign: 'left' }}>Aucun administrateur assigné</p>
                )}
              </div>

              <div className="modal-actions">
                <button
                  className={`btn ${school.is_active ? 'btn-warning' : 'btn-success'}`}
                  onClick={handleToggleActive}
                  disabled={toggling}
                >
                  {toggling ? '...' : school.is_active ? '⏸ Désactiver' : '▶️ Activer'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Fermer</button>
              </div>
            </div>
          )}

          {stats && activeTab === 'stats' && (
            <div className="school-form">
              <div className="stats-grid-detail">
                <div className="stat-detail-card">
                  <div className="stat-detail-icon">👥</div>
                  <div className="stat-detail-value">{stats.total_eleves}</div>
                  <div className="stat-detail-label">Élèves</div>
                </div>
                <div className="stat-detail-card">
                  <div className="stat-detail-icon">👨‍🏫</div>
                  <div className="stat-detail-value">{stats.total_professeurs}</div>
                  <div className="stat-detail-label">Professeurs</div>
                </div>
                <div className="stat-detail-card">
                  <div className="stat-detail-icon">🗄️</div>
                  <div
                    className="stat-detail-value"
                    style={{
                      color:
                        stats.db_status === 'connected' ? '#4ade80'
                        : stats.db_status === 'error' ? '#f87171'
                        : '#fb923c',
                    }}
                  >
                    {stats.db_status === 'connected' ? '✅' : stats.db_status === 'error' ? '❌' : '⚠️'}
                  </div>
                  <div className="stat-detail-label">{stats.db_status}</div>
                </div>
              </div>

              <div className="info-row" style={{ marginTop: '1rem' }}>
                <span className="info-label">Base dédiée</span>
                <code>{stats.db_name}</code>
              </div>
              <div className="info-row">
                <span className="info-label">Message BD</span>
                <span style={{ fontSize: '0.85rem' }}>{stats.db_message}</span>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Fermer</button>
              </div>
            </div>
          )}

          {school && activeTab === 'db' && (
            <div className="school-form">
              <SchoolDbConfigPanel
                school={school}
                onUpdated={() => { loadSchool(); if (onSchoolUpdated) onSchoolUpdated(); }}
              />
              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Fermer</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
