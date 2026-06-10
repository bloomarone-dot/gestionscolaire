import { Fragment } from 'react';
import { TRIMESTRES } from '../utils/notes';
import '../styles/bulletin-detail.css';

function getMentionClass(moyenne) {
  if (moyenne >= 16) return 'excellent';
  if (moyenne >= 14) return 'bien';
  if (moyenne >= 10) return 'passable';
  return 'insuffisant';
}

function CameroonBulletinView({ bulletin }) {
  const isEn = bulletin.lang === 'en';

  return (
    <>
      <div className="bulletin-cameroon-meta">
        <span className="bulletin-section-badge">
          {bulletin.section === 'anglophone' ? '🇬🇧 Anglophone' : '🇫🇷 Francophone'}
        </span>
        <span>{bulletin.term_label}</span>
        {bulletin.classe_serie && bulletin.classe_serie !== '—' && (
          <span>{isEn ? 'Series' : 'Série'} : {bulletin.classe_serie}</span>
        )}
        <span>{isEn ? 'Enrollment' : 'Effectif'} : {bulletin.effectif}</span>
      </div>

      <div className="bulletin-cameroon-summary">
        <div className="bulletin-summary-item">
          <label>{isEn ? 'Term Average' : 'Moyenne'}</label>
          <strong>{bulletin.moyenne_generale}</strong>
        </div>
        <div className="bulletin-summary-item">
          <label>{isEn ? 'Class Average' : 'Moy. classe'}</label>
          <strong>{bulletin.moyenne_classe}</strong>
        </div>
        <div className="bulletin-summary-item">
          <label>{isEn ? 'Position' : 'Rang'}</label>
          <strong>{bulletin.rang_label || bulletin.rang || '—'}</strong>
        </div>
        <div className="bulletin-summary-item">
          <label>{isEn ? 'Remark' : 'Décision'}</label>
          <strong className={bulletin.decision?.includes('ADM') || bulletin.decision === 'PASSED' ? 'decision-pass' : 'decision-fail'}>
            {bulletin.decision}
          </strong>
        </div>
        <div className="bulletin-summary-item">
          <label>{isEn ? 'Total coef / marks' : 'Total coef / notes'}</label>
          <strong>{bulletin.total_coef} / {bulletin.total_points}</strong>
        </div>
      </div>

      <div className="bulletin-detail-table-wrap">
        <table className="bulletin-detail-table bulletin-cameroon-table">
          <thead>
            <tr>
              <th>{isEn ? 'SUBJECTS' : 'MATIERE'}</th>
              <th>{bulletin.seq1_label}</th>
              <th>{bulletin.seq2_label}</th>
              <th>{isEn ? 'Average' : 'Moyenne'}</th>
              <th>Coef</th>
              <th>{isEn ? 'Total' : 'Notes'}</th>
              <th>{isEn ? 'Rank' : 'Rang'}</th>
              <th>Appre.</th>
              <th>{isEn ? 'Teacher' : 'Professeur'}</th>
            </tr>
          </thead>
          <tbody>
            {!bulletin.groupes_matieres?.length ? (
              <tr><td colSpan={9} className="bulletin-empty">Aucune note pour ce trimestre</td></tr>
            ) : (
              bulletin.groupes_matieres.map((group) => (
                <Fragment key={`g-${group.groupe}`}>
                  <tr className="bulletin-group-row">
                    <td colSpan={9}>{group.label}</td>
                  </tr>
                  {group.matieres.map((row) => (
                    <tr key={row.matiere_id || row.matiere}>
                      <td className="matiere-cell">{row.matiere}</td>
                      <td>{row.seq1 ?? '—'}</td>
                      <td>{row.seq2 ?? '—'}</td>
                      <td>{row.moyenne ?? '—'}</td>
                      <td>{row.coef ?? '—'}</td>
                      <td>{row.points ?? '—'}</td>
                      <td>{row.rang_matiere ?? '—'}</td>
                      <td><span className={`appreciation-badge ${row.appreciation === 'A' ? 'app-a' : row.appreciation === 'ECA' || row.appreciation === 'IPA' ? 'app-eca' : 'app-na'}`}>{row.appreciation}</span></td>
                      <td className="prof-cell">{row.professeur}</td>
                    </tr>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function BulletinDetail({ bulletin, onExportCsv, onExportPdf, onExportXlsx, exporting }) {
  if (!bulletin) return null;

  const mentionClass = getMentionClass(bulletin.moyenne_generale);
  const isCameroon = bulletin.format === 'cameroon';

  return (
    <div className="bulletin-detail-card">
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

      {isCameroon ? (
        <CameroonBulletinView bulletin={bulletin} />
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

      <div className="bulletin-trimestre-legend">
        {TRIMESTRES.map((t) => (
          <span key={t} className={bulletin.trimestre === t ? 'active' : ''}>T{t}</span>
        ))}
      </div>
    </div>
  );
}
