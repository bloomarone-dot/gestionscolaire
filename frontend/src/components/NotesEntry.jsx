import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/api';
import '../styles/notes-entry.css';

export default function NotesEntry({ classe, readOnlyMode = false }) {
  const [eleves, setEleves] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notesMap, setNotesMap] = useState({});
  const [selectedMatiere, setSelectedMatiere] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [periodeInfo, setPeriodeInfo] = useState(null);
  const [verificationEnCours, setVerificationEnCours] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editCoefficient, setEditCoefficient] = useState(1);
  const [editCommentaire, setEditCommentaire] = useState('');

  const peutModifier = !readOnlyMode && periodeInfo?.peut_saisir === true;
  const isPeriodeFermee = !readOnlyMode && periodeInfo && !periodeInfo.peut_saisir;
  const dateFin = periodeInfo?.periode?.date_fin
    ? new Date(periodeInfo.periode.date_fin).toLocaleDateString('fr-FR')
    : null;
  const dateDebut = periodeInfo?.periode?.date_debut
    ? new Date(periodeInfo.periode.date_debut).toLocaleDateString('fr-FR')
    : null;

  const loadNotesForMatiere = useCallback(async (matiereId) => {
    if (!classe || !matiereId) return;
    try {
      setVerificationEnCours(true);
      const [notesData, verificationPeriode] = await Promise.all([
        api.getClassNotes(classe.id, matiereId),
        api.verifierPeriodeSaisie(classe.id, matiereId),
      ]);
      const notesMapData = {};
      notesData.forEach((note) => {
        notesMapData[note.eleve_id] = { ...note, matiere_id: note.matiere_id };
      });
      setNotesMap(notesMapData);
      setPeriodeInfo(verificationPeriode);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message || 'Erreur lors du chargement des notes');
      setNotesMap({});
      setPeriodeInfo(null);
    } finally {
      setVerificationEnCours(false);
    }
  }, [classe]);

  const loadData = useCallback(async () => {
    if (!classe) return;
    try {
      setLoading(true);
      setError('');
      const [elevesData, matieresData] = await Promise.all([
        api.getClassEleves(classe.id),
        api.getClassMatieres(classe.id),
      ]);
      setEleves(elevesData);
      setMatieres(matieresData);
      if (matieresData.length > 0) {
        const firstMatiereId = matieresData[0].id;
        setSelectedMatiere(firstMatiereId);
        await loadNotesForMatiere(firstMatiereId);
      } else {
        setSelectedMatiere(null);
        setNotesMap({});
        setPeriodeInfo(null);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [classe, loadNotesForMatiere]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMatiereChange = async (matiereId) => {
    setSelectedMatiere(matiereId);
    setSuccess('');
    setError('');
    setEditingId(null);
    await loadNotesForMatiere(matiereId);
  };

  const handleNoteChange = (eleveId, field, value) => {
    setNotesMap((prev) => {
      const existing = prev[eleveId] || { eleve_id: eleveId };
      return { ...prev, [eleveId]: { ...existing, eleve_id: eleveId, [field]: value } };
    });
  };

  const handleSaveNotes = async () => {
    if (!selectedMatiere) {
      setError('Veuillez sélectionner une matière');
      return;
    }
    if (!peutModifier) {
      setError('Délai de saisie dépassé — contactez l\'administrateur');
      return;
    }
    const notesToSave = Object.values(notesMap).filter((note) => {
      const v = parseFloat(note.valeur);
      return !note.id && !Number.isNaN(v) && v >= 0 && v <= 20;
    });
    if (notesToSave.length === 0) {
      setError('Aucune nouvelle note valide à enregistrer (valeur entre 0 et 20)');
      return;
    }
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const errors = [];
      for (const note of notesToSave) {
        try {
          await api.postNote({
            eleve_id: note.eleve_id,
            matiere_id: selectedMatiere,
            valeur: parseFloat(note.valeur),
            coefficient: note.coefficient ?? 1.0,
            commentaire: note.commentaire || '',
          });
        } catch (err) {
          errors.push(err.message);
        }
      }
      if (errors.length > 0) {
        throw new Error(`${errors.length} note(s) non enregistrée(s): ${errors[0]}`);
      }
      await loadNotesForMatiere(selectedMatiere);
      setSuccess('Notes sauvegardées avec succès !');
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (note) => {
    setEditingId(note.id);
    setEditValue(note.valeur ?? '');
    setEditCoefficient(note.coefficient ?? 1);
    setEditCommentaire(note.commentaire || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
    setEditCoefficient(1);
    setEditCommentaire('');
  };

  const handleSaveEdit = async (noteId) => {
    if (!peutModifier) {
      setError('Délai de saisie dépassé — modification impossible');
      return;
    }
    const valeur = parseFloat(editValue);
    if (Number.isNaN(valeur) || valeur < 0 || valeur > 20) {
      setError('La note doit être comprise entre 0 et 20');
      return;
    }
    try {
      setSavingId(noteId);
      setError('');
      setSuccess('');
      await api.updateNote(noteId, {
        valeur,
        coefficient: editCoefficient,
        commentaire: editCommentaire || null,
      });
      await loadNotesForMatiere(selectedMatiere);
      setSuccess('Note modifiée avec succès');
      setEditingId(null);
    } catch (err) {
      setError(err.message || 'Erreur lors de la modification');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteNote = async (noteId, eleveNom) => {
    if (!peutModifier) {
      setError('Délai de saisie dépassé — suppression impossible');
      return;
    }
    if (!window.confirm(`Supprimer la note de ${eleveNom} ?`)) return;
    try {
      setError('');
      setSuccess('');
      await api.deleteNote(noteId);
      await loadNotesForMatiere(selectedMatiere);
      setSuccess('Note supprimée');
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const renderContent = () => {
    if (verificationEnCours) {
      return <div className="page-loader"><div className="spinner" /></div>;
    }
    if (eleves.length === 0) {
      return (
        <div className="empty-state">
          <p>Aucun élève dans cette classe</p>
        </div>
      );
    }
    return (
      <div className="notes-table">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Matricule</th>
              <th>Note</th>
              <th>Coeff.</th>
              <th>Commentaire</th>
              {peutModifier && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {eleves.map((eleve) => {
              const existingNote = notesMap[eleve.id];
              const isEditing = editingId === existingNote?.id;
              const canEnterNew = peutModifier && !existingNote?.id;
              return (
                <tr key={eleve.id} className={isPeriodeFermee ? 'row-locked' : ''}>
                  <td>{eleve.nom}</td>
                  <td>{eleve.prenom}</td>
                  <td>{eleve.matricule}</td>
                  <td>
                    {isEditing ? (
                      <input type="number" min="0" max="20" step="0.25" value={editValue}
                        onChange={(e) => setEditValue(e.target.value)} className="note-input" autoFocus />
                    ) : canEnterNew ? (
                      <input type="number" min="0" max="20" step="0.25" value={existingNote?.valeur ?? ''}
                        onChange={(e) => handleNoteChange(eleve.id, 'valeur', e.target.value)}
                        className="note-input" placeholder="0-20" />
                    ) : (
                      <span className={`note-value ${existingNote?.id ? '' : 'note-empty'}`}>
                        {existingNote?.id ? existingNote.valeur : '—'}
                      </span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="number" min="0" step="0.25" value={editCoefficient}
                        onChange={(e) => setEditCoefficient(parseFloat(e.target.value) || 1)}
                        className="note-input" style={{ width: 70 }} />
                    ) : canEnterNew ? (
                      <input type="number" min="0" step="0.25" value={existingNote?.coefficient ?? 1}
                        onChange={(e) => handleNoteChange(eleve.id, 'coefficient', parseFloat(e.target.value) || 1)}
                        className="note-input" style={{ width: 70 }} />
                    ) : (
                      <span>{existingNote?.id ? existingNote.coefficient : '—'}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="text" value={editCommentaire}
                        onChange={(e) => setEditCommentaire(e.target.value)} className="note-input" placeholder="Optionnel" />
                    ) : canEnterNew ? (
                      <input type="text" value={existingNote?.commentaire ?? ''}
                        onChange={(e) => handleNoteChange(eleve.id, 'commentaire', e.target.value)}
                        className="note-input" placeholder="Optionnel" />
                    ) : (
                      <span>{existingNote?.id ? existingNote.commentaire || '—' : '—'}</span>
                    )}
                  </td>
                  {peutModifier && (
                    <td>
                      <div className="note-actions">
                        {existingNote?.id && !isEditing && (
                          <button className="btn-icon btn-edit" onClick={() => handleStartEdit(existingNote)}
                            disabled={savingId !== null} title="Modifier">✏️</button>
                        )}
                        {isEditing ? (
                          <>
                            <button className="btn-icon btn-save" onClick={() => handleSaveEdit(existingNote.id)}
                              disabled={savingId === existingNote.id} title="Enregistrer">💾</button>
                            <button className="btn-icon btn-cancel" onClick={handleCancelEdit}
                              disabled={savingId === existingNote.id} title="Annuler">✕</button>
                          </>
                        ) : (
                          existingNote?.id && (
                            <button className="btn-icon btn-delete"
                              onClick={() => handleDeleteNote(existingNote.id, `${eleve.prenom} ${eleve.nom}`)}
                              disabled={savingId !== null} title="Supprimer">🗑️</button>
                          )
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="notes-entry-container">
      <div className="notes-header">
        <h2>Saisie des notes — {classe.nom}</h2>
        {matieres.length > 0 && (
          <div className="matiere-selector">
            <label htmlFor="matiere-select">Matière :</label>
            <select id="matiere-select" value={selectedMatiere || ''}
              onChange={(e) => handleMatiereChange(parseInt(e.target.value, 10))}>
              {matieres.map((m) => (
                <option key={m.id} value={m.id}>{m.nom}</option>
              ))}
            </select>
          </div>
        )}
        {peutModifier && (
          <button className="btn btn-primary" onClick={handleSaveNotes} disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Enregistrer les notes'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {isPeriodeFermee && (
        <div className="alert alert-error periode-locked-banner">
          <span>🔒</span>
          <div>
            <strong>Saisie verrouillée</strong>
            <p>
              Le délai fixé par l&apos;administrateur est dépassé.
              {dateFin && <> Échéance : <strong>{dateFin}</strong>.</>}
              {' '}Vous ne pouvez plus modifier ni supprimer les notes.
            </p>
          </div>
        </div>
      )}

      {peutModifier && dateFin && (
        <div className="alert alert-success">
          <span>✅</span>
          Saisie ouverte du {dateDebut} au <strong>{dateFin}</strong>
        </div>
      )}

      {!periodeInfo?.periode && !readOnlyMode && (
        <div className="alert alert-error">
          <span>⚠️</span>
          Aucun délai configuré par l&apos;administrateur pour cette classe/matière.
        </div>
      )}

      {renderContent()}
    </div>
  );
}
