import { useState, useEffect } from 'react';
import { fetchEleves, createEleve } from '../api/api';

function AddEleveModal({ onClose, onCreated }) {
  const [nom, setNom]           = useState('');
  const [prenom, setPrenom]     = useState('');
  const [matricule, setMat]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nom || !prenom || !matricule) { setError('Tous les champs sont obligatoires.'); return; }
    setLoading(true); setError('');
    try {
      await createEleve(nom, prenom, matricule);
      onCreated();
      onClose();
    } catch(err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">👨‍🎓 Nouvel élève</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error"><span>⚠️</span> {error}</div>}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="e-prenom">Prénom</label>
                <input id="e-prenom" placeholder="Jean" value={prenom} onChange={e => setPrenom(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="e-nom">Nom</label>
                <input id="e-nom" placeholder="Dupont" value={nom} onChange={e => setNom(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="e-mat">Matricule</label>
              <input id="e-mat" placeholder="Ex: 2024-001" value={matricule} onChange={e => setMat(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="save-eleve-btn">
              {loading ? <span className="spinner" /> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ElevesPage() {
  const [eleves, setEleves]       = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function loadEleves() {
    setLoading(true);
    try {
      const data = await fetchEleves();
      setEleves(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadEleves(); }, []);

  const filtered = eleves.filter(el => {
    const q = search.toLowerCase();
    return (
      el.nom.toLowerCase().includes(q) ||
      el.prenom.toLowerCase().includes(q) ||
      el.matricule.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Élèves</h1>
          <p className="page-subtitle">{eleves.length} élève(s) inscrit(s)</p>
        </div>
        <button className="btn btn-primary" id="add-eleve-btn" onClick={() => setShowModal(true)}>
          + Nouvel élève
        </button>
      </div>

      <div className="page-body">
        <div className="card">
          {/* Recherche */}
          <div style={{ marginBottom: 20 }}>
            <input
              id="search-eleves"
              placeholder="🔍  Rechercher par nom, prénom ou matricule…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">Aucun résultat</div>
              <div className="empty-state-text">
                {search ? 'Aucun élève ne correspond à votre recherche.' : 'Ajoutez votre premier élève.'}
              </div>
              {!search && (
                <button className="btn btn-primary mt-16" onClick={() => setShowModal(true)}>
                  + Ajouter un élève
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Prénom</th>
                    <th>Nom</th>
                    <th>Matricule</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(el => (
                    <tr key={el.id}>
                      <td className="text-muted">{el.id}</td>
                      <td>{el.prenom}</td>
                      <td style={{ fontWeight: 600 }}>{el.nom}</td>
                      <td><span className="badge badge-blue">{el.matricule}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <AddEleveModal onClose={() => setShowModal(false)} onCreated={loadEleves} />
      )}
    </>
  );
}
