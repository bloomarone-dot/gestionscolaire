import { useState, useEffect, useCallback } from 'react';
import { fetchEleves, fetchBulletin } from '../api/api';

function getMention(avg) {
  if (avg >= 18) return { label: 'Félicitations', color: 'excellent', emoji: '🏆' };
  if (avg >= 16) return { label: 'Très bien', color: 'excellent', emoji: '⭐' };
  if (avg >= 14) return { label: 'Bien', color: 'bien', emoji: '👍' };
  if (avg >= 12) return { label: 'Assez bien', color: 'bien', emoji: '✅' };
  if (avg >= 10) return { label: 'Passable', color: 'passable', emoji: '📘' };
  return { label: 'Insuffisant', color: 'insuffisant', emoji: '⚠️' };
}

export default function BulletinPage() {
  const [eleves, setEleves] = useState([]);
  const [eleveId, setEleveId] = useState('');
  const [bulletin, setBulletin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEleves, setLE] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) setEleveId(id);
  }, []);

  useEffect(() => {
    fetchEleves()
      .then(setEleves)
      .catch(console.error)
      .finally(() => setLE(false));
  }, []);

  const handleLoad = useCallback(async () => {
    if (!eleveId) return;
    setLoading(true);
    setError('');
    setBulletin(null);
    try {
      const data = await fetchBulletin(parseInt(eleveId, 10));
      if (data.error) setError(data.error);
      else setBulletin(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [eleveId]);

  useEffect(() => {
    if (eleveId) handleLoad();
  }, [eleveId, handleLoad]);

  const mention = bulletin ? getMention(bulletin.moyenne_generale) : null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulletins scolaires</h1>
          <p className="page-subtitle">Consultez le relevé de notes complet d'un élève</p>
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="select-bulletin-eleve">Sélectionner un élève</label>
              {loadingEleves ? (
                <div style={{ height: 42, display: 'flex', alignItems: 'center' }}>
                  <div className="spinner" />
                </div>
              ) : (
                <select
                  id="select-bulletin-eleve"
                  value={eleveId}
                  onChange={e => {
                    setEleveId(e.target.value);
                    setBulletin(null);
                    setError('');
                  }}
                >
                  <option value="">— Choisir un élève —</option>
                  {eleves.map(el => (
                    <option key={el.id} value={el.id}>
                      {el.prenom} {el.nom} ({el.matricule})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              id="view-bulletin-btn"
              className="btn btn-primary"
              onClick={handleLoad}
              disabled={!eleveId || loading}
              style={{ height: 42, whiteSpace: 'nowrap' }}
            >
              {loading ? <span className="spinner" /> : '📋 Afficher le bulletin'}
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {bulletin && (
          <div className="bulletin-card" style={{ animation: 'slideUp 0.25s ease' }}>
            <div className="bulletin-header">
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                  Bulletin de l'élève
                </div>
                <div className="bulletin-name">{bulletin.eleve}</div>
              </div>
              <div className="moyenne-badge">
                <div className={`moyenne-value ${mention.color}`}>
                  {bulletin.moyenne_generale}
                </div>
                <div className="moyenne-label">/ 20</div>
                <div style={{ fontSize: 13, marginTop: 6, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {mention.emoji} {mention.label}
                </div>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              {bulletin.details_notes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📝</div>
                  <div className="empty-state-title">Aucune note enregistrée</div>
                  <div className="empty-state-text">Ajoutez des notes depuis la page dédiée.</div>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Matière</th>
                        <th>Note</th>
                        <th>Mention</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulletin.details_notes.map((n, i) => {
                        const m = getMention(n.note);
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 500 }}>{n.matiere}</td>
                            <td>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: 16,
                                  color: `var(--${m.color === 'excellent' ? 'success' : m.color === 'bien' ? 'accent-400' : m.color === 'passable' ? 'warning' : 'danger'})`,
                                }}
                              >
                                {n.note}
                              </span>
                              <span className="text-muted"> / 20</span>
                            </td>
                            <td>
                              <span
                                className={`badge badge-${
                                  m.color === 'excellent'
                                    ? 'green'
                                    : m.color === 'bien'
                                    ? 'blue'
                                    : m.color === 'passable'
                                    ? 'orange'
                                    : 'red'
                                }`}
                              >
                                {m.emoji} {m.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {!bulletin && !error && !loading && (
          <div className="empty-state card">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">Aucun bulletin affiché</div>
            <div className="empty-state-text">Sélectionnez un élève pour consulter son bulletin.</div>
          </div>
        )}
      </div>
    </>
  );
}
