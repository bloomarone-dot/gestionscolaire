import { useState, useEffect } from 'react';
import * as api from '../api/api';
import '../styles/admin-notes.css';

export default function AdminNotesPage() {
  const [classes, setClasses] = useState([]);
  const [selectedClasseId, setSelectedClasseId] = useState('');
  const [eleves, setEleves] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValeur, setEditValeur] = useState('');
  const [editCoefficient, setEditCoefficient] = useState(1);
  const [editCommentaire, setEditCommentaire] = useState('');

  useEffect(() => {
    api.fetchClasses()
      .then(setClasses)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedClasseId) {
      setEleves([]);
      setMatieres([]);
      setNotes([]);
      setSelectedMatiereId('');
      return;
    }
    setLoading(true);
    setError('');
    Promise.all([
      api.fetchEleves_admin(selectedClasseId, ''),
      api.fetchMatieres(),
      api.fetchNotes({ classe_id: selectedClasseId }),
    ])
      .then(([elevesData, matieresData, notesData]) => {
        setEleves(elevesData || []);
        setMatieres(matieresData || []);
        setNotes(notesData || []);
        if (matieresData?.length && !selectedMatiereId) {
          setSelectedMatiereId(String(matieresData[0].id));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // selectedMatiereId volontairement exclu : on ne réinitialise la matière que au changement de classe
  }, [selectedClasseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedClasseId || !selectedMatiereId) {
      setNotes([]);
      return;
    }
    setLoading(true);
    api.fetchNotes({ classe_id: selectedClasseId, matiere_id: Number(selectedMatiereId) })
      .then((data) => setNotes(data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedClasseId, selectedMatiereId]);

  const handleStartEdit = (note) => {
    setEditingId(note.id);
    setEditValeur(note.valeur);
    setEditCoefficient(note.coefficient ?? 1);
    setEditCommentaire(note.commentaire || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValeur('');
    setEditCoefficient(1);
    setEditCommentaire('');
  };

  const handleSaveEdit = async (noteId) => {
    const parsedValeur = Number(editValeur);
    if (Number.isNaN(parsedValeur) || parsedValeur < 0 || parsedValeur > 20) {
      setError('La note doit être comprise entre 0 et 20');
      return;
    }
    try {
      setSavingId(noteId);
      setError('');
      setSuccess('');
      const updated = await api.updateNote(noteId, {
        valeur: parsedValeur,
        coefficient: Number(editCoefficient),
        commentaire: editCommentaire || null,
      });
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setSuccess('Note modifiée');
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteNote = async (noteId, eleve) => {
    if (!window.confirm(`Supprimer la note de ${eleve} ?`)) return;
    try {
      setError('');
      setSuccess('');
      await api.deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setSuccess('Note supprimée');
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const eleveNameById = (id) => {
    const el = eleves.find((e) => e.id === id);
    return el ? `${el.prenom} ${el.nom}` : '—';
  };

  const matiereNameById = (id) => {
    const m = matieres.find((item) => item.id === id);
    return m ? m.nom : '—';
  };

  return (
    <div className="admin-notes-page">
      <h2>Gestion des notes</h2>
      <div className="admin-notes-filters">
        <div className="form-group">
          <label>Classe</label>
          <select
            value={selectedClasseId}
            onChange={(e) => {
              setSelectedClasseId(e.target.value);
              setSelectedMatiereId('');
              setEditingId(null);
            }}
          >
            <option value="">— Choisir une classe —</option>
            {classes.map((classe) => (
              <option key={classe.id} value={classe.id}>
                {classe.nom} ({classe.niveau})
              </option>
            ))}
          </select>
        </div>

        {selectedClasseId && (
          <div className="form-group">
            <label>Matière</label>
            <select
              value={selectedMatiereId}
              onChange={(e) => {
                setSelectedMatiereId(e.target.value);
                setEditingId(null);
              }}
            >
              <option value="">— Toutes les matières —</option>
              {matieres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="page-loader">
          <div className="spinner" />
        </div>
      ) : (
        <div className="notes-table-wrap">
          <table className="admin-notes-table">
            <thead>
              <tr>
                <th>Élève</th>
                <th>Matière</th>
                <th>Note</th>
                <th>Coefficient</th>
                <th>Commentaire</th>
                <th>Dernière saisie</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notes.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    Aucune note pour cette sélection
                  </td>
                </tr>
              ) : (
                notes.map((note) => {
                  const isEditing = editingId === note.id;
                  return (
                    <tr key={note.id}>
                      <td>{eleveNameById(note.eleve_id)}</td>
                      <td>{matiereNameById(note.matiere_id)}</td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            max="20"
                            step="0.25"
                            value={editValeur}
                            onChange={(e) => setEditValeur(e.target.value)}
                            className="note-input"
                          />
                        ) : (
                          note.valeur
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            value={editCoefficient}
                            onChange={(e) => setEditCoefficient(Number(e.target.value))}
                            className="note-input"
                          />
                        ) : (
                          note.coefficient
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editCommentaire}
                            onChange={(e) => setEditCommentaire(e.target.value)}
                            className="note-input"
                          />
                        ) : (
                          note.commentaire || '—'
                        )}
                      </td>
                      <td>{new Date(note.date_saisie).toLocaleString('fr-FR')}</td>
                      <td>
                        <div className="note-actions">
                          {isEditing ? (
                            <>
                              <button
                                className="btn-icon btn-save"
                                onClick={() => handleSaveEdit(note.id)}
                                disabled={savingId === note.id}
                              >
                                💾
                              </button>
                              <button
                                className="btn-icon btn-cancel"
                                onClick={handleCancelEdit}
                                disabled={savingId === note.id}
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn-icon btn-edit"
                                onClick={() => handleStartEdit(note)}
                                disabled={savingId !== null}
                              >
                                ✏️
                              </button>
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteNote(note.id, eleveNameById(note.eleve_id))}
                                disabled={savingId !== null}
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
