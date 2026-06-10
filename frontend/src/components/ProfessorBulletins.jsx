import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/api';
import '../styles/professor-bulletins.css';

function getMentionClass(moyenne) {
  if (moyenne >= 16) return 'excellent';
  if (moyenne >= 14) return 'bien';
  if (moyenne >= 10) return 'passable';
  return 'insuffisant';
}

function getMentionLabel(moyenne) {
  if (moyenne >= 16) return 'Excellent';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 10) return 'Passable';
  return 'Insuffisant';
}

export default function ProfessorBulletins() {
  const [classes, setClasses] = useState([]);
  const [selectedClasse, setSelectedClasse] = useState(null);
  const [eleves, setEleves] = useState([]);
  const [selectedEleve, setSelectedEleve] = useState(null);
  const [bulletin, setBulletin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingBulletin, setLoadingBulletin] = useState(false);
  const [error, setError] = useState('');

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getProfessorClasses();
      setClasses(data);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleClasseSelect = async (classe) => {
    setSelectedClasse(classe);
    setSelectedEleve(null);
    setBulletin(null);
    try {
      setLoading(true);
      const data = await api.getClassEleves(classe.id);
      setEleves(data);
    } catch (err) {
      setError(err.message);
      setEleves([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEleveSelect = async (eleve) => {
    setSelectedEleve(eleve);
    setBulletin(null);
    try {
      setLoadingBulletin(true);
      setError('');
      const data = await api.fetchBulletin(eleve.id);
      if (data.error) {
        setError(data.error);
      } else {
        setBulletin(data);
      }
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement du bulletin');
    } finally {
      setLoadingBulletin(false);
    }
  };

  if (loading && classes.length === 0) {
    return <div className="page-loader"><div className="spinner" /></div>;
  }

  return (
    <div className="prof-bulletins">
      <div className="prof-bulletins-steps">
        <div className={`bulletin-step ${!selectedClasse ? 'active' : 'done'}`}>1. Classe</div>
        <div className={`bulletin-step ${selectedClasse && !selectedEleve ? 'active' : selectedEleve ? 'done' : ''}`}>2. Élève</div>
        <div className={`bulletin-step ${selectedEleve ? 'active' : ''}`}>3. Bulletin</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="prof-bulletins-layout">
        <aside className="prof-bulletins-sidebar">
          <h3>Mes classes</h3>
          {classes.length === 0 ? (
            <p className="text-muted">Aucune classe assignée</p>
          ) : (
            <ul className="bulletin-classe-list">
              {classes.map((classe) => (
                <li key={classe.id}>
                  <button
                    type="button"
                    className={`bulletin-classe-btn ${selectedClasse?.id === classe.id ? 'active' : ''}`}
                    onClick={() => handleClasseSelect(classe)}
                  >
                    <span>{classe.nom}</span>
                    <small>{classe.niveau}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="prof-bulletins-main">
          {!selectedClasse ? (
            <div className="empty-state">
              <div className="empty-state-icon">📄</div>
              <p className="empty-state-title">Sélectionnez une classe</p>
              <p className="empty-state-text">Choisissez une classe à gauche pour consulter les bulletins des élèves.</p>
            </div>
          ) : (
            <>
              <div className="eleves-picker">
                <h3>Élèves — {selectedClasse.nom}</h3>
                {eleves.length === 0 ? (
                  <p className="text-muted">Aucun élève dans cette classe</p>
                ) : (
                  <div className="eleves-chips">
                    {eleves.map((eleve) => (
                      <button
                        key={eleve.id}
                        type="button"
                        className={`eleve-chip ${selectedEleve?.id === eleve.id ? 'active' : ''}`}
                        onClick={() => handleEleveSelect(eleve)}
                      >
                        {eleve.prenom} {eleve.nom}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {loadingBulletin && (
                <div className="page-loader"><div className="spinner" /></div>
              )}

              {bulletin && selectedEleve && !loadingBulletin && (
                <div className="bulletin-card bulletin-card-animated">
                  <div className="bulletin-header">
                    <div>
                      <div className="bulletin-name">{bulletin.eleve}</div>
                      <div className="text-muted">{selectedClasse.nom} — {getMentionLabel(bulletin.moyenne_generale)}</div>
                    </div>
                    <div className="moyenne-badge">
                      <div className={`moyenne-value ${getMentionClass(bulletin.moyenne_generale)}`}>
                        {bulletin.moyenne_generale}
                      </div>
                      <div className="moyenne-label">Moyenne / 20</div>
                    </div>
                  </div>
                  <div className="bulletin-body">
                    <table>
                      <thead>
                        <tr>
                          <th>Matière</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulletin.details_notes.length === 0 ? (
                          <tr>
                            <td colSpan={2} style={{ textAlign: 'center', padding: '1.5rem' }}>
                              Aucune note enregistrée
                            </td>
                          </tr>
                        ) : (
                          bulletin.details_notes.map((item, idx) => (
                            <tr key={`${item.matiere}-${idx}`}>
                              <td>{item.matiere}</td>
                              <td>
                                <span className={`note-badge ${getMentionClass(item.note)}`}>
                                  {item.note}/20
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
