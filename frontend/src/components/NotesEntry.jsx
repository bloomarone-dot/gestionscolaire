import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/api';
import {
  TRIMESTRES,
  EVAL_TYPES,
  evalTypeLabel,
  calcMoyenneTrimestre,
  getSeqNotesForEleve,
  getAppreciation,
  formatSessionCountdown,
} from '../utils/notes';
import '../styles/notes-entry.css';
import '../styles/professor-workspace.css';

export default function NotesEntry({
  classe,
  readOnlyMode = false,
  variant = 'default',
  fixedMatiereId = null,
  matiereName = '',
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [eleves, setEleves] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notesMap, setNotesMap] = useState({});
  const [trimestreNotes, setTrimestreNotes] = useState([]);
  const [selectedMatiere, setSelectedMatiere] = useState(null);
  const [selectedTrimestre, setSelectedTrimestre] = useState(1);
  const [selectedType, setSelectedType] = useState('sequence_1');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [periodeInfo, setPeriodeInfo] = useState(null);
  const [verificationEnCours, setVerificationEnCours] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editCoefficient, setEditCoefficient] = useState(1);
  const [editCommentaire, setEditCommentaire] = useState('');
  const [savedSnapshot, setSavedSnapshot] = useState({});

  const isProfessorLayout = variant === 'professor' && !isAdmin;

  const peutModifier = isAdmin ? !readOnlyMode : (!readOnlyMode && periodeInfo?.peut_saisir === true);
  const isPeriodeFermee = !isAdmin && !readOnlyMode && periodeInfo && !periodeInfo.peut_saisir;
  const dateFin = periodeInfo?.periode?.date_fin
    ? new Date(periodeInfo.periode.date_fin).toLocaleDateString('fr-FR')
    : null;
  const dateDebut = periodeInfo?.periode?.date_debut
    ? new Date(periodeInfo.periode.date_debut).toLocaleDateString('fr-FR')
    : null;

  const fetchNotes = useCallback(async (classeId, matiereId, trimestre, typeEval) => {
    if (isAdmin) {
      return api.fetchNotes({
        classe_id: classeId,
        matiere_id: matiereId,
        trimestre,
        type_evaluation: typeEval,
      });
    }
    return api.getClassNotes(classeId, matiereId, trimestre, typeEval);
  }, [isAdmin]);

  const fetchAllTrimestreNotes = useCallback(async (classeId, matiereId, trimestre) => {
    if (isAdmin) {
      return api.fetchNotes({ classe_id: classeId, matiere_id: matiereId, trimestre });
    }
    return api.getClassNotes(classeId, matiereId, trimestre);
  }, [isAdmin]);

  const loadNotesForMatiere = useCallback(async (matiereId, trimestre, typeEval) => {
    if (!classe || !matiereId) return;
    try {
      setVerificationEnCours(true);
      const requests = [
        fetchNotes(classe.id, matiereId, trimestre, typeEval),
        fetchAllTrimestreNotes(classe.id, matiereId, trimestre),
      ];
      if (!isAdmin) {
        requests.push(api.verifierPeriodeSaisie(classe.id, matiereId));
      }
      const [notesData, allNotes, verificationPeriode] = await Promise.all(requests);

      const notesMapData = {};
      notesData.forEach((note) => {
        notesMapData[note.eleve_id] = { ...note, matiere_id: note.matiere_id };
      });
      setNotesMap(notesMapData);
      setSavedSnapshot(notesMapData);
      setTrimestreNotes(allNotes || []);
      if (!isAdmin) setPeriodeInfo(verificationPeriode);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message || 'Erreur lors du chargement des notes');
      setNotesMap({});
      setTrimestreNotes([]);
      if (!isAdmin) setPeriodeInfo(null);
    } finally {
      setVerificationEnCours(false);
    }
  }, [classe, fetchNotes, fetchAllTrimestreNotes, isAdmin]);

  const loadData = useCallback(async () => {
    if (!classe) return;
    try {
      setLoading(true);
      setError('');
      const [elevesData, matieresData] = await Promise.all([
        isAdmin ? api.fetchEleves_admin(classe.id) : api.getClassEleves(classe.id),
        isAdmin ? api.fetchMatieres() : api.getClassMatieres(classe.id),
      ]);
      setEleves(elevesData);
      setMatieres(matieresData);
      if (matieresData.length > 0) {
        const targetId = fixedMatiereId && matieresData.some((m) => m.id === fixedMatiereId)
          ? fixedMatiereId
          : matieresData[0].id;
        setSelectedMatiere(targetId);
        await loadNotesForMatiere(targetId, selectedTrimestre, selectedType);
      } else {
        setSelectedMatiere(null);
        setNotesMap({});
        setTrimestreNotes([]);
        setPeriodeInfo(null);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [classe, isAdmin, loadNotesForMatiere, fixedMatiereId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const reloadCurrent = async () => {
    if (selectedMatiere) {
      await loadNotesForMatiere(selectedMatiere, selectedTrimestre, selectedType);
    }
  };

  const handleMatiereChange = async (matiereId) => {
    setSelectedMatiere(matiereId);
    setSuccess('');
    setError('');
    setEditingId(null);
    await loadNotesForMatiere(matiereId, selectedTrimestre, selectedType);
  };

  const handleTrimestreChange = async (trimestre) => {
    setSelectedTrimestre(trimestre);
    setSuccess('');
    setError('');
    setEditingId(null);
    if (selectedMatiere) {
      await loadNotesForMatiere(selectedMatiere, trimestre, selectedType);
    }
  };

  const handleTypeChange = async (typeEval) => {
    setSelectedType(typeEval);
    setSuccess('');
    setError('');
    setEditingId(null);
    if (selectedMatiere) {
      await loadNotesForMatiere(selectedMatiere, selectedTrimestre, typeEval);
    }
  };

  const handleNoteChange = (eleveId, field, value) => {
    setNotesMap((prev) => {
      const existing = prev[eleveId] || { eleve_id: eleveId };
      return { ...prev, [eleveId]: { ...existing, eleve_id: eleveId, [field]: value } };
    });
  };

  const buildNotePayload = (note) => ({
    eleve_id: note.eleve_id,
    matiere_id: selectedMatiere,
    valeur: parseFloat(note.valeur),
    coefficient: note.coefficient ?? 1.0,
    commentaire: note.commentaire || '',
    trimestre: selectedTrimestre,
    type_evaluation: selectedType,
  });

  const handleCancelChanges = () => {
    setNotesMap({ ...savedSnapshot });
    setEditingId(null);
    setError('');
    setSuccess('');
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

    const notesToProcess = isProfessorLayout
      ? eleves.map((eleve) => notesMap[eleve.id]).filter(Boolean)
      : Object.values(notesMap);

    const notesToSave = notesToProcess.filter((note) => {
      const v = parseFloat(note.valeur);
      return !Number.isNaN(v) && v >= 0 && v <= 20 && (
        !note.id || isProfessorLayout
      );
    });

    const newNotes = notesToSave.filter((n) => !n.id);
    const existingNotes = isProfessorLayout
      ? notesToSave.filter((n) => {
          if (!n.id) return false;
          const snap = savedSnapshot[n.eleve_id];
          if (!snap) return true;
          return String(snap.valeur) !== String(n.valeur)
            || (snap.commentaire || '') !== (n.commentaire || '');
        })
      : [];

    if (newNotes.length === 0 && existingNotes.length === 0 && !isProfessorLayout) {
      setError('Aucune nouvelle note valide à enregistrer (valeur entre 0 et 20)');
      return;
    }
    if (isProfessorLayout && newNotes.length === 0 && existingNotes.length === 0) {
      setError('Aucune modification à enregistrer');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const errors = [];
      for (const note of newNotes) {
        try {
          await api.postNote(buildNotePayload(note));
        } catch (err) {
          errors.push(err.message);
        }
      }
      for (const note of existingNotes) {
        try {
          await api.updateNote(note.id, {
            valeur: parseFloat(note.valeur),
            coefficient: note.coefficient ?? 1,
            commentaire: note.commentaire || null,
          });
        } catch (err) {
          errors.push(err.message);
        }
      }
      if (errors.length > 0) {
        throw new Error(`${errors.length} note(s) non enregistrée(s): ${errors[0]}`);
      }
      await reloadCurrent();
      const total = newNotes.length + existingNotes.length;
      setSuccess(`${total} note(s) enregistrée(s) — ${evalTypeLabel(selectedType)}, trimestre ${selectedTrimestre}`);
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyCalculatedTrimestre = (eleveId) => {
    const { seq1, seq2 } = getSeqNotesForEleve(eleveId, trimestreNotes, selectedTrimestre);
    const moyenne = calcMoyenneTrimestre(seq1, seq2);
    if (moyenne === null) {
      setError('Saisissez d\'abord les notes des 1ère et 2ème séquences');
      return;
    }
    handleNoteChange(eleveId, 'valeur', moyenne);
    setError('');
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
      await reloadCurrent();
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
      await reloadCurrent();
      setSuccess('Note supprimée');
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleExport = async () => {
    if (!selectedMatiere) return;
    try {
      setExporting(true);
      setError('');
      await api.exportNotesCsv(classe.id, selectedMatiere, selectedTrimestre);
      setSuccess('Export CSV téléchargé');
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const selectedMatiereObj = matieres.find((m) => m.id === selectedMatiere);
  const notesSaisies = eleves.filter((e) => {
    const n = notesMap[e.id];
    if (!n) return false;
    const v = parseFloat(n.valeur);
    return !Number.isNaN(v) && v >= 0;
  }).length;

  const sessionOpen = periodeInfo?.peut_saisir === true;
  const countdown = formatSessionCountdown(periodeInfo?.periode?.date_fin);

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
              {selectedType === 'trimestre' && <th>Moy. calc.</th>}
              <th>{evalTypeLabel(selectedType)}</th>
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
              const { seq1, seq2 } = getSeqNotesForEleve(eleve.id, trimestreNotes, selectedTrimestre);
              const moyenneCalc = calcMoyenneTrimestre(seq1, seq2);

              return (
                <tr key={eleve.id} className={isPeriodeFermee ? 'row-locked' : ''}>
                  <td>{eleve.nom}</td>
                  <td>{eleve.prenom}</td>
                  <td>{eleve.matricule}</td>
                  {selectedType === 'trimestre' && (
                    <td className="moyenne-calc-cell">
                      {moyenneCalc !== null ? (
                        <span className="moyenne-calc-value">{moyenneCalc}</span>
                      ) : (
                        <span className="note-empty">—</span>
                      )}
                    </td>
                  )}
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
                        {selectedType === 'trimestre' && canEnterNew && moyenneCalc !== null && (
                          <button type="button" className="btn-icon btn-calc" title="Appliquer la moyenne calculée"
                            onClick={() => handleApplyCalculatedTrimestre(eleve.id)}>📊</button>
                        )}
                        {existingNote?.id && !isEditing && (
                          <button type="button" className="btn-icon btn-edit" onClick={() => handleStartEdit(existingNote)}
                            disabled={savingId !== null} title="Modifier">✏️</button>
                        )}
                        {isEditing ? (
                          <>
                            <button type="button" className="btn-icon btn-save" onClick={() => handleSaveEdit(existingNote.id)}
                              disabled={savingId === existingNote.id} title="Enregistrer">💾</button>
                            <button type="button" className="btn-icon btn-cancel" onClick={handleCancelEdit}
                              disabled={savingId === existingNote.id} title="Annuler">✕</button>
                          </>
                        ) : (
                          existingNote?.id && (
                            <button type="button" className="btn-icon btn-delete"
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

  if (isProfessorLayout) {
    return (
      <div className="prof-workspace">
        <div className="prof-context-cards">
          <div className="prof-context-card">
            <div className="prof-context-icon">📐</div>
            <div>
              <div className="prof-context-label">Matière</div>
              <div className="prof-context-value">{matiereName || selectedMatiereObj?.nom || '—'}</div>
            </div>
          </div>
          <div className="prof-context-card">
            <div className="prof-context-icon">🏫</div>
            <div>
              <div className="prof-context-label">Classe</div>
              <div className="prof-context-value">{classe.nom}</div>
            </div>
          </div>
          <div className="prof-context-card">
            <div className="prof-context-icon">👥</div>
            <div>
              <div className="prof-context-label">Effectif</div>
              <div className="prof-context-value">{eleves.length} élève{eleves.length > 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="prof-sequence-select">
            <label htmlFor="prof-trimestre">Trimestre</label>
            <select id="prof-trimestre" value={selectedTrimestre}
              onChange={(e) => handleTrimestreChange(parseInt(e.target.value, 10))}>
              {TRIMESTRES.map((t) => (
                <option key={t} value={t}>{t}er trimestre</option>
              ))}
            </select>
          </div>
          <div className="prof-sequence-select">
            <label htmlFor="prof-type">Séquence / Période</label>
            <select id="prof-type" value={selectedType} onChange={(e) => handleTypeChange(e.target.value)}>
              {EVAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={`prof-session-card ${sessionOpen ? 'open' : 'closed'}`}>
          <div className="prof-session-label">Session de saisie</div>
          <div className={`prof-session-status ${sessionOpen ? 'open' : 'closed'}`}>
            {sessionOpen ? '● OUVERTE' : '● FERMÉE'}
          </div>
          {periodeInfo?.periode ? (
            <div className="prof-session-dates">
              Du {dateDebut} au <strong>{dateFin}</strong>
              {countdown && <div className="prof-session-countdown">{countdown}</div>}
            </div>
          ) : (
            <div className="prof-session-dates">Aucune période configurée par l&apos;administrateur.</div>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="prof-notes-panel">
          <div className="prof-notes-panel-header">
            <h2>Saisie des notes</h2>
            <div className="prof-notes-panel-actions">
              {peutModifier && (
                <>
                  <button type="button" className="btn btn-secondary" onClick={handleCancelChanges} disabled={saving}>
                    Annuler les modifications
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleSaveNotes} disabled={saving}>
                    {saving ? 'Enregistrement…' : 'Enregistrer les notes'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="prof-info-banner">
            Les appréciations sont générées automatiquement selon la note. Vous pouvez ajouter un commentaire personnalisé pour chaque élève.
          </div>

          {verificationEnCours ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : eleves.length === 0 ? (
            <div className="empty-state"><p>Aucun élève dans cette classe</p></div>
          ) : (
            <div className="prof-notes-table-wrap">
              <table className="prof-notes-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Matricule</th>
                    <th>Nom et Prénoms</th>
                    <th>Note / 20</th>
                    <th>Appréciation</th>
                    <th>Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {eleves.map((eleve, index) => {
                    const note = notesMap[eleve.id] || {};
                    const valeur = note.valeur ?? '';
                    const appreciation = getAppreciation(valeur);
                    const vNum = parseFloat(valeur);
                    const isFail = !Number.isNaN(vNum) && vNum < 10;
                    const canEdit = peutModifier;

                    return (
                      <tr key={eleve.id} className={isPeriodeFermee ? 'row-locked' : ''}>
                        <td className="col-num">{index + 1}</td>
                        <td>{eleve.matricule}</td>
                        <td className="col-name">{eleve.nom} {eleve.prenom}</td>
                        <td>
                          {canEdit ? (
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.25"
                              value={valeur}
                              className={`prof-note-input ${isFail ? 'fail' : ''}`}
                              placeholder="—"
                              onChange={(e) => handleNoteChange(eleve.id, 'valeur', e.target.value)}
                            />
                          ) : (
                            <span className={isFail ? 'fail' : ''}>{valeur !== '' ? valeur : '—'}</span>
                          )}
                        </td>
                        <td>
                          {appreciation.className ? (
                            <span className={`appreciation-badge ${appreciation.className}`}>
                              {appreciation.label}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {canEdit ? (
                            <textarea
                              className="prof-comment-input"
                              rows={1}
                              placeholder="Optionnel"
                              value={note.commentaire ?? ''}
                              onChange={(e) => handleNoteChange(eleve.id, 'commentaire', e.target.value)}
                            />
                          ) : (
                            <span>{note.commentaire || '—'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="prof-notes-footer">
            <div className="prof-notes-stats">
              <span>Total élèves : <strong>{eleves.length}</strong></span>
              <span>Notes saisies : <strong>{notesSaisies} / {eleves.length}</strong></span>
            </div>
            <div className="prof-lock-hint">
              <span>🔒</span>
              {sessionOpen
                ? 'Les modifications sont possibles tant que la session est ouverte.'
                : 'Session fermée — contactez l\'administrateur pour toute modification.'}
            </div>
            {peutModifier && (
              <button type="button" className="btn btn-primary" onClick={handleSaveNotes} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer les notes'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-entry-container">
      <div className="notes-header">
        <h2>Saisie des notes — {classe.nom}</h2>
        <div className="notes-filters">
          {matieres.length > 0 && (
            <div className="matiere-selector">
              <label htmlFor="matiere-select">Matière</label>
              <select id="matiere-select" value={selectedMatiere || ''}
                onChange={(e) => handleMatiereChange(parseInt(e.target.value, 10))}>
                {matieres.map((m) => (
                  <option key={m.id} value={m.id}>{m.nom}</option>
                ))}
              </select>
            </div>
          )}
          <div className="matiere-selector">
            <label htmlFor="trimestre-select">Trimestre</label>
            <select id="trimestre-select" value={selectedTrimestre}
              onChange={(e) => handleTrimestreChange(parseInt(e.target.value, 10))}>
              {TRIMESTRES.map((t) => (
                <option key={t} value={t}>{t}er trimestre</option>
              ))}
            </select>
          </div>
          <div className="matiere-selector">
            <label htmlFor="type-select">Évaluation</label>
            <select id="type-select" value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value)}>
              {EVAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="notes-header-actions">
          {selectedMatiere && (
            <button type="button" className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Export...' : 'Exporter CSV'}
            </button>
          )}
          {peutModifier && (
            <button type="button" className="btn btn-primary" onClick={handleSaveNotes} disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          )}
        </div>
      </div>

      <div className="notes-period-info">
        <span className="notes-period-badge">
          Trimestre {selectedTrimestre} — {evalTypeLabel(selectedType)}
        </span>
        {selectedType === 'trimestre' && (
          <span className="notes-period-hint">
            La moyenne calculée combine les 1ère et 2ème séquences (pondérées par coefficient).
          </span>
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

      {peutModifier && dateFin && !isAdmin && (
        <div className="alert alert-success">
          <span>✅</span>
          Saisie ouverte du {dateDebut} au <strong>{dateFin}</strong>
        </div>
      )}

      {!isAdmin && !periodeInfo?.periode && !readOnlyMode && (
        <div className="alert alert-error">
          <span>⚠️</span>
          Aucun délai configuré par l&apos;administrateur pour cette classe/matière.
        </div>
      )}

      {renderContent()}
    </div>
  );
}
