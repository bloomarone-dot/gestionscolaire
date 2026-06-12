import { useState, useEffect, useMemo, useCallback } from 'react';
import * as api from '../api/api';
import { SECTION_OPTIONS, getSectionLabel } from '../utils/sections';
import '../styles/eleves-list.css';

export default function ElevesList() {
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingEleve, setEditingEleve] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [elevesData, classesData] = await Promise.all([
        api.fetchEleves_admin(),
        api.fetchClasses(),
      ]);
      setEleves(elevesData);
      setClasses(classesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filtered = useMemo(() => {
    return eleves.filter((e) => {
      const matchSearch =
        !search ||
        e.nom.toLowerCase().includes(search.toLowerCase()) ||
        (e.prenom || '').toLowerCase().includes(search.toLowerCase()) ||
        e.matricule.toLowerCase().includes(search.toLowerCase());
      const matchClasse = !filterClasse || String(e.classe_id) === filterClasse;
      const matchSection = !filterSection || e.section === filterSection;
      return matchSearch && matchClasse && matchSection;
    });
  }, [eleves, search, filterClasse, filterSection]);

  const handleDelete = async (eleveId, name) => {
    if (!window.confirm(`Supprimer "${name}" ?`)) return;
    try {
      await api.deleteEleve_admin(eleveId);
      setEleves((prev) => prev.filter((e) => e.id !== eleveId));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      {loading ? (
        <div className="card"><div className="card-body text-muted">Chargement...</div></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Gestion des élèves <span className="badge badge-light ml-2">{eleves.length}</span></h3>
            <div className="card-tools">
              <button type="button" className="btn btn-secondary btn-sm mr-2" onClick={() => { setShowImport(true); setSuccess(''); setError(''); }}>
                <i className="fas fa-file-import mr-1" />
                Importer
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditingEleve(null); setShowModal(true); }}>
                <i className="fas fa-plus mr-1" />
                Ajouter
              </button>
            </div>
          </div>
          <ElevesFilters
            search={search}
            setSearch={setSearch}
            filterSection={filterSection}
            setFilterSection={setFilterSection}
            filterClasse={filterClasse}
            setFilterClasse={setFilterClasse}
            classes={classes}
          />
          <div className="card-body text-center py-5">
            <i className="fas fa-users fa-2x text-muted mb-3" />
            <h3 className="h5">Aucun élève trouvé</h3>
            <p className="text-muted">{search || filterClasse ? 'Modifiez vos filtres' : 'Commencez par inscrire le premier élève'}</p>
            {!search && !filterClasse && (
              <button className="btn btn-primary" onClick={() => { setEditingEleve(null); setShowModal(true); }}>
                Inscrire un élève
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Gestion des élèves <span className="badge badge-light ml-2">{eleves.length}</span></h3>
            <div className="card-tools">
              <button type="button" className="btn btn-secondary btn-sm mr-2" onClick={() => { setShowImport(true); setSuccess(''); setError(''); }}>
                <i className="fas fa-file-import mr-1" />
                Importer
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditingEleve(null); setShowModal(true); }}>
                <i className="fas fa-plus mr-1" />
                Ajouter
              </button>
            </div>
          </div>
          <ElevesFilters
            search={search}
            setSearch={setSearch}
            filterSection={filterSection}
            setFilterSection={setFilterSection}
            filterClasse={filterClasse}
            setFilterClasse={setFilterClasse}
            classes={classes}
          />
          <div className="card-body table-responsive p-0">
            <table className="table table-hover text-nowrap mb-0">
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Section</th>
                  <th>Classe</th>
                  <th>Date d'inscription</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((eleve) => (
                  <tr key={eleve.id}>
                    <td><code>{eleve.matricule}</code></td>
                    <td><strong>{eleve.nom}</strong></td>
                    <td>{eleve.prenom}</td>
                    <td>{eleve.section ? getSectionLabel(eleve.section) : '—'}</td>
                    <td>
                      {eleve.classe_nom ? (
                        <span className="badge badge-info">{eleve.classe_nom}</span>
                      ) : (
                        <span className="badge badge-light">Non assigné</span>
                      )}
                    </td>
                    <td>{new Date(eleve.date_inscription).toLocaleDateString('fr-FR')}</td>
                    <td className="text-right">
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-default"
                          title="Modifier"
                          onClick={() => { setEditingEleve(eleve); setShowModal(true); }}
                        >
                          <i className="fas fa-edit" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          title="Supprimer"
                          onClick={() => handleDelete(eleve.id, `${eleve.prenom} ${eleve.nom}`)}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <EleveModal
          eleve={editingEleve}
          classes={classes}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadAll(); }}
        />
      )}

      {showImport && (
        <EleveImportModal
          classes={classes}
          defaultClasseId={filterClasse ? Number(filterClasse) : null}
          onClose={() => setShowImport(false)}
          onImported={(result) => {
            setShowImport(false);
            setSuccess(`${result.total} élève(s) importé(s) (${result.created} nouveau(x), ${result.updated} mis à jour)`);
            if (result.errors?.length) {
              setError(`${result.errors.length} ligne(s) ignorée(s) — ${result.errors.slice(0, 3).join(' · ')}`);
            }
            loadAll();
          }}
        />
      )}
    </div>
  );
}

function ElevesFilters({
  search,
  setSearch,
  filterSection,
  setFilterSection,
  filterClasse,
  setFilterClasse,
  classes,
}) {
  return (
    <div className="card-body border-bottom">
      <div className="row">
        <div className="col-lg-6 mb-2 mb-lg-0">
          <input
            type="search"
            className="form-control"
            placeholder="Rechercher par nom, prénom, matricule..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-lg-3 mb-2 mb-lg-0">
          <select
            className="form-control"
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
          >
            <option value="">Toutes les sections</option>
            {SECTION_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="col-lg-3">
          <select
            className="form-control"
            value={filterClasse}
            onChange={(e) => setFilterClasse(e.target.value)}
          >
            <option value="">Toutes les classes</option>
            {classes
              .filter((c) => !filterSection || c.section === filterSection)
              .map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nom} ({c.niveau}) — {c.section === 'anglophone' ? 'EN' : 'FR'}
                </option>
              ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function EleveImportModal({ classes, defaultClasseId, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const defaultClasse = classes.find((c) => c.id === defaultClasseId);

  const handleDownloadTemplate = async () => {
    try {
      setLoading(true);
      await api.downloadElevesImportTemplate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Choisissez un fichier Excel (.xlsx) ou CSV (.csv)');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const result = await api.importElevesFile(file, defaultClasseId);
      onImported(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal eleves-import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Importer une liste d&apos;élèves</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="eleves-import-body">
          {error && <div className="form-error">{error}</div>}
          <p className="eleves-import-intro">
            Au lieu d&apos;ajouter élève par élève, téléchargez le modèle Excel, remplissez la liste
            (matricule, nom, prénom, classe…) puis importez le fichier. Les élèves existants sont mis à jour
            par matricule.
          </p>
          {defaultClasse && (
            <p className="eleves-import-hint">
              Classe par défaut : <strong>{defaultClasse.nom}</strong> (si la colonne Classe est vide)
            </p>
          )}
          <div className="eleves-import-actions">
            <button type="button" className="btn btn-secondary" onClick={handleDownloadTemplate} disabled={loading}>
              Télécharger le modèle Excel
            </button>
            <label className="btn btn-secondary eleves-import-file-btn">
              {file ? file.name : 'Choisir un fichier'}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <small className="form-section-hint">
            Formats acceptés : .xlsx, .csv. Si vous avez une fiche PDF, exportez-la d&apos;abord en Excel ou CSV.
          </small>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="button" className="btn btn-primary" onClick={handleImport} disabled={loading || !file}>
              {loading ? 'Import en cours...' : 'Importer la liste'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EleveModal({ eleve, classes, onClose, onSaved }) {
  const isEdit = !!eleve;
  const [form, setForm] = useState({
    nom: eleve?.nom || '',
    prenom: eleve?.prenom || '',
    matricule: eleve?.matricule || '',
    section: eleve?.section || 'francophone',
    classe_id: eleve?.classe_id ? String(eleve.classe_id) : '',
  });

  const filteredClasses = classes.filter(
    (c) => !form.section || c.section === form.section,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!form.nom?.trim()) {
      setError('Le nom est obligatoire.');
      setLoading(false);
      return;
    }
    if (!form.prenom?.trim()) {
      setError('Le prénom est obligatoire.');
      setLoading(false);
      return;
    }
    try {
      const payload = {
        ...form,
        classe_id: form.classe_id ? parseInt(form.classe_id, 10) : null,
        section: form.section,
      };
      if (isEdit) {
        await api.updateEleve_admin(eleve.id, {
          nom: payload.nom,
          prenom: payload.prenom,
          classe_id: payload.classe_id,
          section: payload.section,
        });
      } else {
        await api.createEleve_admin(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? `Modifier — ${eleve.prenom} ${eleve.nom}` : 'Inscrire un élève'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="school-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>Nom *</label>
              <input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
                placeholder="Nom de famille"
              />
            </div>
            <div className="form-group">
              <label>Prénom *</label>
              <input
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                required
                placeholder="Prénom de l'élève"
              />
            </div>
          </div>

          {!isEdit && (
            <div className="form-group">
              <label>Matricule *</label>
              <input
                value={form.matricule}
                onChange={(e) => setForm({ ...form, matricule: e.target.value })}
                required
                placeholder="Ex: EL-2024-001"
              />
            </div>
          )}

          <div className="form-group">
            <label>Section *</label>
            <select
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value, classe_id: '' })}
              required
            >
              {SECTION_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <small className="form-section-hint">Détermine la langue du bulletin et les classes disponibles.</small>
          </div>

          <div className="form-group">
            <label>Classe</label>
            <select
              value={form.classe_id}
              onChange={(e) => setForm({ ...form, classe_id: e.target.value })}
            >
              <option value="">— Choisir une classe —</option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nom} ({c.niveau})
                </option>
              ))}
            </select>
            {filteredClasses.length === 0 && (
              <small className="form-section-hint">Aucune classe en section {form.section}. Créez-en une d&apos;abord.</small>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Inscrire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
