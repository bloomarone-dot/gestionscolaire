import { useState, useEffect, useCallback } from 'react';
import { fetchEleves_admin, fetchEleveBulletin, exportEleveBulletinCsv, exportEleveBulletinPdf } from '../api/api';
import { TRIMESTRES } from '../utils/notes';
import BulletinDetail from '../components/BulletinDetail';

export default function BulletinPage() {
  const [eleves, setEleves] = useState([]);
  const [eleveId, setEleveId] = useState('');
  const [trimestre, setTrimestre] = useState(1);
  const [bulletin, setBulletin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEleves, setLE] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) setEleveId(id);
  }, []);

  useEffect(() => {
    fetchEleves_admin()
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
      const data = await fetchEleveBulletin(parseInt(eleveId, 10), trimestre);
      setBulletin(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [eleveId, trimestre]);

  useEffect(() => {
    if (eleveId) handleLoad();
  }, [eleveId, trimestre, handleLoad]);

  const handleExportCsv = async () => {
    if (!eleveId) return;
    try {
      setExporting(true);
      await exportEleveBulletinCsv(parseInt(eleveId, 10), trimestre);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!eleveId) return;
    try {
      setExporting(true);
      await exportEleveBulletinPdf(parseInt(eleveId, 10), trimestre);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulletins scolaires</h1>
          <p className="page-subtitle">Relevé par trimestre : séquences, coefficients et moyennes</p>
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label htmlFor="select-bulletin-eleve">Élève</label>
              {loadingEleves ? (
                <div style={{ height: 42, display: 'flex', alignItems: 'center' }}>
                  <div className="spinner" />
                </div>
              ) : (
                <select
                  id="select-bulletin-eleve"
                  value={eleveId}
                  onChange={(e) => {
                    setEleveId(e.target.value);
                    setBulletin(null);
                    setError('');
                  }}
                >
                  <option value="">— Choisir un élève —</option>
                  {eleves.map((el) => (
                    <option key={el.id} value={el.id}>
                      {el.prenom} {el.nom} ({el.matricule})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="select-trimestre">Trimestre</label>
              <select
                id="select-trimestre"
                value={trimestre}
                onChange={(e) => setTrimestre(parseInt(e.target.value, 10))}
              >
                {TRIMESTRES.map((t) => (
                  <option key={t} value={t}>{t}er trimestre</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleLoad}
              disabled={!eleveId || loading}
              style={{ height: 42 }}
            >
              {loading ? <span className="spinner" /> : 'Afficher'}
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {bulletin && (
          <BulletinDetail
            bulletin={bulletin}
            onExportCsv={handleExportCsv}
            onExportPdf={handleExportPdf}
            exporting={exporting}
          />
        )}

        {!bulletin && !error && !loading && (
          <div className="empty-state card">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">Aucun bulletin affiché</div>
            <div className="empty-state-text">Sélectionnez un élève et un trimestre.</div>
          </div>
        )}
      </div>
    </>
  );
}
