import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/api';
import { TRIMESTRES } from '../utils/notes';
import BulletinDetail from './BulletinDetail';
import '../styles/professor-bulletins.css';
import '../styles/bulletin-detail.css';

function getMentionClass(moyenne) {
  if (moyenne >= 16) return 'excellent';
  if (moyenne >= 14) return 'bien';
  if (moyenne >= 10) return 'passable';
  return 'insuffisant';
}

export default function BulletinModule({ loadClasses, loadEleves, isProfessor = false }) {
  const allowExports = !isProfessor;
  const [classes, setClasses] = useState([]);
  const [selectedClasse, setSelectedClasse] = useState(null);
  const [selectedTrimestre, setSelectedTrimestre] = useState(1);
  const [eleves, setEleves] = useState([]);
  const [selectedEleve, setSelectedEleve] = useState(null);
  const [bulletin, setBulletin] = useState(null);
  const [classeBulletins, setClasseBulletins] = useState(null);
  const [viewMode, setViewMode] = useState('eleve');
  const [loading, setLoading] = useState(true);
  const [loadingBulletin, setLoadingBulletin] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bulletinSettings, setBulletinSettings] = useState(null);
  const [exportTemplate, setExportTemplate] = useState('auto');

  useEffect(() => {
    if (!allowExports) return;
    api.fetchBulletinSettings()
      .then((data) => {
        setBulletinSettings(data);
        if (data?.bulletin_template) setExportTemplate(data.bulletin_template === 'standard' ? 'standard' : 'auto');
      })
      .catch(() => {});
  }, [allowExports]);

  const bulletinScope = bulletinSettings?.bulletin_scope || 'trimestre';

  const loadClassList = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await loadClasses();
      setClasses(data);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [loadClasses]);

  useEffect(() => {
    loadClassList();
  }, [loadClassList]);

  useEffect(() => {
    if (isProfessor && viewMode !== 'eleve') {
      setViewMode('eleve');
    }
  }, [isProfessor, viewMode]);

  const handleClasseSelect = async (classe) => {
    setSelectedClasse(classe);
    setSelectedEleve(null);
    setBulletin(null);
    setClasseBulletins(null);
    try {
      setLoading(true);
      const [elevesData, bulletinsData] = await Promise.all([
        loadEleves(classe.id),
        api.fetchClasseBulletins(classe.id, selectedTrimestre),
      ]);
      setEleves(elevesData);
      setClasseBulletins(bulletinsData);
    } catch (err) {
      setError(err.message);
      setEleves([]);
      setClasseBulletins(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTrimestreChange = async (trimestre) => {
    setSelectedTrimestre(trimestre);
    setSelectedEleve(null);
    setBulletin(null);
    if (!selectedClasse) return;
    try {
      setLoadingBulletin(true);
      const bulletinsData = await api.fetchClasseBulletins(selectedClasse.id, trimestre);
      setClasseBulletins(bulletinsData);
      if (selectedEleve) {
        const b = await api.fetchEleveBulletin(selectedEleve.id, trimestre, 'cameroon', bulletinScope);
        setBulletin(b);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingBulletin(false);
    }
  };

  const handleEleveSelect = async (eleve) => {
    setSelectedEleve(eleve);
    setViewMode('eleve');
    try {
      setLoadingBulletin(true);
      setError('');
      const data = await api.fetchEleveBulletin(eleve.id, selectedTrimestre, 'cameroon', bulletinScope);
      setBulletin(data);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement du bulletin');
      setBulletin(null);
    } finally {
      setLoadingBulletin(false);
    }
  };

  const handleExportEleveCsv = async () => {
    if (!selectedEleve) return;
    try {
      setExporting(true);
      await api.exportEleveBulletinCsv(selectedEleve.id, selectedTrimestre);
      setSuccess('Bulletin exporté (CSV)');
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportElevePdf = async () => {
    if (!selectedEleve) return;
    try {
      setExporting(true);
      await api.exportEleveBulletinPdf(selectedEleve.id, selectedTrimestre, exportTemplate);
      setSuccess('Bulletin PDF téléchargé');
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportClasseCsv = async () => {
    if (!selectedClasse) return;
    try {
      setExporting(true);
      await api.exportClasseBulletinsCsv(selectedClasse.id, selectedTrimestre);
      setSuccess('Bulletins de classe exportés (CSV)');
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportClasseXlsx = async () => {
    if (!selectedClasse) return;
    try {
      setExporting(true);
      await api.exportClasseBulletinsXlsx(selectedClasse.id, selectedTrimestre);
      setSuccess('Bulletins de classe exportés (Excel)');
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setExporting(true);
      await api.downloadBulletinImportTemplate();
      setSuccess('Modèle Excel téléchargé');
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleImportXlsx = async () => {
    if (!selectedClasse || !importFile) return;
    try {
      setImporting(true);
      setError('');
      setImportResult(null);
      const result = await api.importBulletinsXlsx(selectedClasse.id, selectedTrimestre, importFile);
      setImportResult(result);
      setSuccess(`${result.total} note(s) importée(s) (${result.imported} nouvelle(s), ${result.updated} mise(s) à jour)`);
      setImportFile(null);
      const bulletinsData = await api.fetchClasseBulletins(selectedClasse.id, selectedTrimestre);
      setClasseBulletins(bulletinsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  if (loading && classes.length === 0) {
    return <div className="page-loader"><div className="spinner" /></div>;
  }

  return (
    <div className={`prof-bulletins ${isProfessor ? 'prof-bulletins-readonly' : ''}`}>
      <div className="prof-bulletins-toolbar">
        <div className="matiere-selector">
          <label>{bulletinScope === 'annual' ? 'Année' : 'Trimestre'}</label>
          <select
            value={selectedTrimestre}
            disabled={bulletinScope === 'annual'}
            onChange={(e) => handleTrimestreChange(parseInt(e.target.value, 10))}
          >
            {bulletinScope === 'annual' ? (
              <option value={1}>Bulletin annuel (6 séquences)</option>
            ) : (
              TRIMESTRES.map((t) => (
                <option key={t} value={t}>{t}er trimestre</option>
              ))
            )}
          </select>
        </div>
        {allowExports && bulletinSettings?.available_templates && (
          <div className="matiere-selector">
            <label>Format PDF</label>
            <select value={exportTemplate} onChange={(e) => setExportTemplate(e.target.value)}>
              <option value="auto">Modèle établissement (auto)</option>
              {Object.entries(bulletinSettings.available_templates).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
        )}
        {selectedClasse && allowExports && (
          <div className="bulletin-view-toggle">
            <button type="button" className={viewMode === 'eleve' ? 'active' : ''} onClick={() => setViewMode('eleve')}>
              Par élève
            </button>
            <button type="button" className={viewMode === 'classe' ? 'active' : ''} onClick={() => setViewMode('classe')}>
              Classement
            </button>
            <button type="button" className={viewMode === 'import' ? 'active' : ''} onClick={() => setViewMode('import')}>
              Importer Excel
            </button>
          </div>
        )}
      </div>

      <div className="prof-bulletins-steps">
        <div className={`bulletin-step ${!selectedClasse ? 'active' : 'done'}`}>1. Classe</div>
        <div className={`bulletin-step ${selectedClasse && viewMode === 'eleve' && !selectedEleve ? 'active' : selectedEleve ? 'done' : ''}`}>
          2. {viewMode === 'classe' ? 'Classement' : viewMode === 'import' ? 'Import' : 'Élève'}
        </div>
        <div className={`bulletin-step ${(selectedEleve && viewMode === 'eleve') || (viewMode === 'import' && importFile) ? 'active' : ''}`}>
          3. {viewMode === 'import' ? 'Fichier' : 'Bulletin'}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="prof-bulletins-layout">
        <aside className="prof-bulletins-sidebar">
          <h3>{isProfessor ? 'Mes classes' : 'Classes'}</h3>
          {isProfessor && selectedClasse && (
            <p className="prof-eleves-count">{eleves.length} élève{eleves.length !== 1 ? 's' : ''}</p>
          )}
          {classes.length === 0 ? (
            <p className="text-muted">Aucune classe</p>
          ) : (
            <ul className="bulletin-classe-list">
              {classes.map((classe) => (
                <li key={classe.id}>
                  <button
                    type="button"
                    className={`bulletin-classe-btn ${selectedClasse?.id === classe.id ? 'active' : ''}`}
                    onClick={() => handleClasseSelect(classe)}
                  >
                    <span>{classe.nom}</span>
                    <small>{classe.niveau}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="prof-bulletins-main">
          {!selectedClasse ? (
            <div className="empty-state">
              <div className="empty-state-icon">📄</div>
              <p className="empty-state-title">Sélectionnez une classe</p>
              <p className="empty-state-text">
                {isProfessor
                  ? 'Choisissez une classe pour consulter l\'effectif et les résultats de vos élèves.'
                  : 'Consultez les bulletins par trimestre avec séquences et moyennes.'}
              </p>
            </div>
          ) : viewMode === 'import' ? (
            <div className="bulletin-import-panel">
              <h3>Importer des notes depuis Excel</h3>
              <p className="bulletin-import-hint">
                Téléchargez le modèle, remplissez les colonnes (Matricule, Matière, Type, Note) puis importez le fichier.
                Les bulletins seront recalculés automatiquement pour le trimestre {selectedTrimestre}.
              </p>
              <div className="bulletin-import-actions">
                <button type="button" className="btn btn-secondary" onClick={handleDownloadTemplate} disabled={exporting}>
                  Télécharger le modèle
                </button>
                <label className="btn btn-secondary bulletin-file-label">
                  {importFile ? importFile.name : 'Choisir un fichier .xlsx'}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    hidden
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleImportXlsx}
                  disabled={!importFile || importing}
                >
                  {importing ? 'Import en cours…' : 'Importer'}
                </button>
              </div>
              {importResult?.errors?.length > 0 && (
                <div className="bulletin-import-errors">
                  <strong>{importResult.error_count} erreur(s) :</strong>
                  <ul>
                    {importResult.errors.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : viewMode === 'classe' ? (
            <>
              {classeBulletins && (
                <div className="bulletin-classe-summary">
                  <div className="bulletin-summary-card">
                    <div className="bulletin-summary-value">{classeBulletins.effectif}</div>
                    <div className="bulletin-summary-label">Élèves</div>
                  </div>
                  <div className="bulletin-summary-card">
                    <div className="bulletin-summary-value">T{selectedTrimestre}</div>
                    <div className="bulletin-summary-label">Trimestre</div>
                  </div>
                  <div className="bulletin-summary-card">
                    <div className="bulletin-summary-value">{classeBulletins.classe}</div>
                    <div className="bulletin-summary-label">Classe</div>
                  </div>
                  {allowExports && (
                    <div className="bulletin-export-group bulletin-export-inline">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportClasseCsv} disabled={exporting}>
                        CSV classe
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportClasseXlsx} disabled={exporting}>
                        Excel classe
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="bulletin-detail-table-wrap">
                <table className="bulletin-detail-table bulletin-ranking-table">
                  <thead>
                    <tr>
                      <th>Rang</th>
                      <th>Élève</th>
                      <th>Matricule</th>
                      <th>Moyenne</th>
                      <th>Mention</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!classeBulletins?.bulletins?.length ? (
                      <tr><td colSpan={6} className="bulletin-empty">Aucune note pour ce trimestre</td></tr>
                    ) : (
                      classeBulletins.bulletins.map((b) => (
                        <tr key={b.eleve_id}>
                          <td className="rang-cell">{b.rang}</td>
                          <td style={{ textAlign: 'left', fontWeight: 600 }}>{b.eleve}</td>
                          <td>{b.matricule}</td>
                          <td>
                            <span className={`note-badge ${getMentionClass(b.moyenne_generale)}`}>
                              {b.moyenne_generale}
                            </span>
                          </td>
                          <td>{b.mention}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleEleveSelect(eleves.find((e) => e.id === b.eleve_id) || { id: b.eleve_id })}
                            >
                              Voir
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="eleves-picker">
                <h3>{isProfessor ? `Effectif — ${selectedClasse.nom}` : `Élèves — ${selectedClasse.nom}`}</h3>
                {eleves.length === 0 ? (
                  <p className="text-muted">Aucun élève</p>
                ) : (
                  <div className="eleves-chips">
                    {eleves.map((eleve) => (
                      <button
                        key={eleve.id}
                        type="button"
                        className={`eleve-chip ${selectedEleve?.id === eleve.id ? 'active' : ''}`}
                        onClick={() => handleEleveSelect(eleve)}
                      >
                        {eleve.prenom} {eleve.nom}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {loadingBulletin && <div className="page-loader"><div className="spinner" /></div>}

              {isProfessor && selectedEleve && (
                <p className="prof-readonly-hint">Consultation seule — export et impression réservés à l&apos;administrateur.</p>
              )}

              {bulletin && selectedEleve && !loadingBulletin && (
                <BulletinDetail
                  bulletin={bulletin}
                  onExportCsv={allowExports ? handleExportEleveCsv : undefined}
                  onExportPdf={allowExports ? handleExportElevePdf : undefined}
                  exporting={exporting}
                  readOnly={isProfessor}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
