import { TRIMESTRES } from '../utils/notes';
import BulletinScolaire from './BulletinScolaire';
import '../styles/bulletin-detail.css';

function getMentionClass(moyenne) {
  if (moyenne >= 16) return 'excellent';
  if (moyenne >= 14) return 'bien';
  if (moyenne >= 10) return 'passable';
  return 'insuffisant';
}

export default function BulletinDetail({
  bulletin,
  onExportCsv,
  onExportPdf,
  onExportXlsx,
  exporting,
  readOnly = false,
  variant = 'default',
}) {
  if (!bulletin) return null;

  const mentionClass = getMentionClass(bulletin.moyenne_generale);
  const isCameroon = bulletin.format === 'cameroon';
  const officialOnly = variant === 'official' || (readOnly && isCameroon);

  return (
    <div className={`bulletin-detail-card${officialOnly ? ' bulletin-detail-official' : ''}`}>
      {!officialOnly && (
        <div className="bulletin-detail-header">
          <div>
            <div className="bulletin-detail-label">
              {isCameroon
                ? (bulletin.lang === 'en' ? "Student's Progress Report Card" : 'Bulletin scolaire officiel')
                : 'Bulletin scolaire'}
            </div>
            <h3 className="bulletin-detail-name">{bulletin.eleve}</h3>
            <div className="bulletin-detail-meta">
              {bulletin.matricule && <span>Matricule : {bulletin.matricule}</span>}
              {bulletin.classe && <span>Classe : {bulletin.classe}</span>}
              {bulletin.annee_scolaire && <span>Année : {bulletin.annee_scolaire}</span>}
              <span>{bulletin.term_label || `Trimestre ${bulletin.trimestre}`}</span>
              {(bulletin.rang_label || bulletin.rang) && (
                <span>Rang : {bulletin.rang_label || bulletin.rang}</span>
              )}
            </div>
          </div>
          <div className="bulletin-detail-score">
            <div className={`bulletin-moyenne ${mentionClass}`}>{bulletin.moyenne_generale}</div>
            <div className="bulletin-moyenne-label">Moyenne / 20</div>
            <div className={`bulletin-mention ${mentionClass}`}>
              {bulletin.appreciation_generale || bulletin.mention}
            </div>
          </div>
        </div>
      )}

      {!readOnly && (onExportCsv || onExportPdf || onExportXlsx) && (
        <div className="bulletin-detail-actions">
          {onExportCsv && (
            <button type="button" className="btn btn-secondary" onClick={onExportCsv} disabled={exporting}>
              {exporting ? 'Export...' : 'CSV'}
            </button>
          )}
          {onExportPdf && (
            <button type="button" className="btn btn-primary" onClick={onExportPdf} disabled={exporting}>
              {exporting ? 'Export...' : 'PDF officiel'}
            </button>
          )}
          {onExportXlsx && (
            <button type="button" className="btn btn-secondary" onClick={onExportXlsx} disabled={exporting}>
              {exporting ? 'Export...' : 'Exporter Excel'}
            </button>
          )}
        </div>
      )}

      {officialOnly && onExportPdf && (
        <div className="bulletin-detail-actions bulletin-detail-actions-official">
          <button type="button" className="btn btn-primary" onClick={onExportPdf} disabled={exporting}>
            {exporting ? 'Export...' : 'Télécharger PDF officiel'}
          </button>
        </div>
      )}

      {isCameroon ? (
        <BulletinScolaire bulletin={bulletin} />
      ) : (
        <div className="bulletin-detail-table-wrap">
          <table className="bulletin-detail-table">
            <thead>
              <tr>
                <th>Matière</th>
                <th>1ère séq.</th>
                <th>Coef.</th>
                <th>2ème séq.</th>
                <th>Coef.</th>
                <th>Note trim.</th>
                <th>Coef.</th>
                <th>Moy. calc.</th>
                <th>Moy. matière</th>
              </tr>
            </thead>
            <tbody>
              {bulletin.details_matieres?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="bulletin-empty">Aucune note pour ce trimestre</td>
                </tr>
              ) : (
                bulletin.details_matieres.map((row) => (
                  <tr key={row.matiere_id || row.matiere}>
                    <td className="matiere-cell">{row.matiere}</td>
                    <td>{row.sequence_1 ?? '—'}</td>
                    <td>{row.coef_sequence_1 ?? '—'}</td>
                    <td>{row.sequence_2 ?? '—'}</td>
                    <td>{row.coef_sequence_2 ?? '—'}</td>
                    <td>{row.note_trimestre ?? '—'}</td>
                    <td>{row.coef_trimestre ?? '—'}</td>
                    <td className="calc-cell">{row.moyenne_calculee ?? '—'}</td>
                    <td>
                      <span className={`note-badge ${row.moyenne_matiere != null ? getMentionClass(row.moyenne_matiere) : ''}`}>
                        {row.moyenne_matiere ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!officialOnly && (
        <div className="bulletin-trimestre-legend">
          {TRIMESTRES.map((t) => (
            <span key={t} className={bulletin.trimestre === t ? 'active' : ''}>T{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
