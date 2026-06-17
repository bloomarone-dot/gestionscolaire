import { useState, useEffect } from 'react';
import { fetchEleves, fetchMatieres, addNote } from '../api/api';

export default function NotesPage() {
  const [eleves, setEleves]       = useState([]);
  const [matieres, setMatieres]   = useState([]);
  const [eleveId, setEleveId]     = useState('');
  const [matiereId, setMatiereId] = useState('');
  const [valeur, setValeur]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [loadingEleves, setLoadingEleves] = useState(true);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');

  useEffect(() => {
    Promise.all([fetchEleves(), fetchMatieres()])
      .then(([elevesData, matieresData]) => {
        setEleves(elevesData);
        setMatieres(matieresData);
      })
      .catch(console.error)
      .finally(() => setLoadingEleves(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!eleveId || !matiereId || !valeur) {
      setError('Tous les champs sont obligatoires.');
      return;
    }
    const note = parseFloat(valeur);
    if (isNaN(note) || note < 0 || note > 20) {
      setError('La note doit être entre 0 et 20.');
      return;
    }
    setLoading(true); setError(''); setSuccess('');
    try {
      await addNote(parseInt(eleveId, 10), parseInt(matiereId, 10), note);
      const el = eleves.find(e => e.id === parseInt(eleveId, 10));
      const mat = matieres.find(m => m.id === parseInt(matiereId, 10));
      setSuccess(`Note ${note}/20 ajoutée pour ${el?.prenom} ${el?.nom} en ${mat?.nom || 'cette matière'} !`);
      setMatiereId(''); setValeur('');
    } catch(err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getMentionColor(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '';
    if (n >= 16) return 'var(--success)';
    if (n >= 14) return 'var(--accent-400)';
    if (n >= 10) return 'var(--warning)';
    return 'var(--danger)';
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Saisie des notes</h1>
          <p className="page-subtitle">Attribuez des notes par matière à chaque élève</p>
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ maxWidth: 600 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
            📝 Nouvelle note
          </h2>

          {success && (
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              <span>✅</span> {success}
            </div>
          )}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Sélection élève */}
            <div className="form-group">
              <label htmlFor="select-eleve">Élève</label>
              {loadingEleves ? (
                <div className="page-loader" style={{ height: 44 }}><div className="spinner" /></div>
              ) : (
                <select
                  id="select-eleve"
                  value={eleveId}
                  onChange={e => setEleveId(e.target.value)}
                >
                  <option value="">— Sélectionner un élève —</option>
                  {eleves.map(el => (
                    <option key={el.id} value={el.id}>
                      {el.prenom} {el.nom} ({el.matricule})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Matière */}
            <div className="form-group">
              <label htmlFor="select-matiere">Matière</label>
              <select
                id="select-matiere"
                value={matiereId}
                onChange={e => setMatiereId(e.target.value)}
              >
                <option value="">— Sélectionner une matière —</option>
                {matieres.map(m => (
                  <option key={m.id} value={m.id}>{m.nom}</option>
                ))}
              </select>
              {matieres.length === 0 && !loadingEleves && (
                <p className="text-muted" style={{ fontSize: 13, marginTop: 6 }}>
                  Aucune matière configurée. Créez des matières depuis le tableau de bord admin.
                </p>
              )}
            </div>

            {/* Note */}
            <div className="form-group">
              <label htmlFor="input-note">Note (sur 20)</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="input-note"
                  type="number"
                  min="0" max="20" step="0.25"
                  placeholder="Ex: 14.5"
                  value={valeur}
                  onChange={e => setValeur(e.target.value)}
                  style={{ paddingRight: 60 }}
                />
                {valeur !== '' && (
                  <span style={{
                    position: 'absolute',
                    right: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 13, fontWeight: 700,
                    color: getMentionColor(valeur),
                  }}>
                    / 20
                  </span>
                )}
              </div>
              {valeur !== '' && !isNaN(parseFloat(valeur)) && (
                <div style={{ fontSize: 12, color: getMentionColor(valeur), marginTop: 4 }}>
                  {parseFloat(valeur) >= 16 ? '🏆 Excellent'
                    : parseFloat(valeur) >= 14 ? '👍 Bien'
                    : parseFloat(valeur) >= 10 ? '✅ Passable'
                    : '⚠️ Insuffisant'}
                </div>
              )}
            </div>

            <button
              id="add-note-btn"
              type="submit"
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start', padding: '12px 32px' }}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : '+ Enregistrer la note'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
