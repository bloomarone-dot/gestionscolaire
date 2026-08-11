import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/api';
import { TRIMESTRES } from '../utils/notes';
import BulletinDetail from './BulletinDetail';
import '../styles/professor-bulletins.css';
import '../styles/bulletin-detail.css';

export default function ProfessorMesEleves() {
  const [classes, setClasses] = useState([]);
  const [selectedClasse, setSelectedClasse] = useState(null);
  const [selectedTrimestre, setSelectedTrimestre] = useState(1);
  const [eleves, setEleves] = useState([]);
  const [selectedEleve, setSelectedEleve] = useState(null);
  const [bulletin, setBulletin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingBulletin, setLoadingBulletin] = useState(false);
  const [error, setError] = useState('');

  const loadClassList = useCallback(async () => {
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
    loadClassList();
  }, [loadClassList]);

  const handleClasseSelect = async (classe) => {
    setSelectedClasse(classe);
    setSelectedEleve(null);
    setBulletin(null);
    try {
      setLoading(true);
      const elevesData = await api.getClassEleves(classe.id);
      setEleves(elevesData);
    } catch (err) {
      setError(err.message);
      setEleves([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrimestreChange = async (trimestre) => {
    setSelectedTrimestre(trimestre);
    setSelectedEleve(null);
    setBulletin(null);
    if (selectedEleve) {
      try {
        setLoadingBulletin(true);
        const data = await api.fetchEleveBulletin(selectedEleve.id, trimestre);
        setBulletin(data);
      } catch (err) {
        setError(err.message);
        setBulletin(null);
      } finally {
        setLoadingBulletin(false);
      }
    }
  };

  const handleEleveSelect = async (eleve) => {
    setSelectedEleve(eleve);
    try {
      setLoadingBulletin(true);
      setError('');
      const data = await api.fetchEleveBulletin(eleve.id, selectedTrimestre);
      setBulletin(data);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement');
      setBulletin(null);
    } finally {
      setLoadingBulletin(false);
    }
  };

  if (loading && classes.length === 0) {
    return <div className="page-loader"><div className="spinner" /></div>;
  }

  return (
    <div className="prof-bulletins prof-bulletins-readonly">
      <div className="prof-bulletins-toolbar">
        <div className="matiere-selector">
          <label>Trimestre</label>
          <select value={selectedTrimestre} onChange={(e) => handleTrimestreChange(parseInt(e.target.value, 10))}>
            {TRIMESTRES.map((t) => (
              <option key={t} value={t}>{t}er trimestre</option>
            ))}
          </select>
        </div>
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
              <div className="empty-state-icon">👥</div>
              <p className="empty-state-title">Sélectionnez une classe</p>
              <p className="empty-state-text">Consultez l&apos;effectif et les résultats de vos élèves (lecture seule).</p>
            </div>
          ) : (
            <>
              <div className="eleves-picker">
                <h3>Effectif — {selectedClasse.nom} ({eleves.length} élève{eleves.length !== 1 ? 's' : ''})</h3>
                {eleves.length === 0 ? (
                  <p className="text-muted">Aucun élève</p>
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

              {selectedEleve && (
                <p className="prof-readonly-hint">
                  Consultation seule — l&apos;export et l&apos;impression sont réservés à l&apos;administrateur.
                </p>
              )}

              {loadingBulletin && <div className="page-loader"><div className="spinner" /></div>}

              {bulletin && selectedEleve && !loadingBulletin && (
                <BulletinDetail bulletin={bulletin} readOnly />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
