import { useState, useEffect } from 'react';
import * as api from '../api/api';
import NotesEntry from '../components/NotesEntry';
import '../styles/admin-notes.css';

export default function AdminNotesPage() {
  const [classes, setClasses] = useState([]);
  const [selectedClasse, setSelectedClasse] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.fetchClasses()
      .then(setClasses)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="admin-notes-page">
      <h2>Gestion des notes</h2>
      <p className="admin-notes-intro">
        Saisissez les notes par trimestre : 1ère séquence, 2ème séquence, note trimestrielle et coefficient.
        Exportez les données en CSV à tout moment.
      </p>

      <div className="admin-notes-filters">
        <div className="form-group">
          <label>Classe</label>
          <select
            value={selectedClasse?.id || ''}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedClasse(id ? classes.find((c) => String(c.id) === id) : null);
            }}
          >
            <option value="">— Choisir une classe —</option>
            {classes.map((classe) => (
              <option key={classe.id} value={classe.id}>
                {classe.nom} ({classe.niveau}) — {classe.section === 'anglophone' ? 'Anglophone' : 'Francophone'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {selectedClasse ? (
        <NotesEntry classe={selectedClasse} />
      ) : (
        <div className="empty-state">
          <p>Sélectionnez une classe pour saisir ou consulter les notes.</p>
        </div>
      )}
    </div>
  );
}
