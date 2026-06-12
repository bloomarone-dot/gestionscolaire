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
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Gestion des notes</h3>
        </div>
        <div className="card-body">
          <p className="text-muted">
            Saisissez les notes par trimestre : 1ère séquence, 2ème séquence, note trimestrielle et coefficient.
          </p>
          <div className="form-group mb-0">
          <label>Classe</label>
          <select
            className="form-control"
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
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {selectedClasse ? (
        <NotesEntry classe={selectedClasse} />
      ) : (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="fas fa-edit fa-2x text-muted mb-3" />
            <p className="text-muted mb-0">Sélectionnez une classe pour saisir ou consulter les notes.</p>
          </div>
        </div>
      )}
    </div>
  );
}
