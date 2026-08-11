import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/api';
import '../styles/classes-grid.css';

export default function ClassesGrid({ onClasseSelect }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getProfessorClasses();
      setClasses(data);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message || 'Erreur lors du chargement des classes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="classes-grid-container">
      {error && <div className="alert alert-error">{error}</div>}
      {classes.length === 0 ? (
        <div className="empty-state">
          <p>Aucune classe assignée</p>
        </div>
      ) : (
        <div className="classes-grid">
          {classes.map(classe => (
            <div
              key={classe.id}
              className="classe-card clickable"
              onClick={() => onClasseSelect(classe)}
            >
              <h3>{classe.nom}</h3>
              <p><strong>Niveau:</strong> {classe.niveau}</p>
              <p><strong>Capacité:</strong> {classe.capacite} élèves</p>
              {classe.salle && <p><strong>Salle:</strong> {classe.salle}</p>}
              <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
                Saisir notes
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
