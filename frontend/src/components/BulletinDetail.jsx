import { Fragment } from 'react';
import { TRIMESTRES } from '../utils/notes';
import '../styles/bulletin-detail.css';

function getMentionClass(moyenne) {
  if (moyenne >= 16) return 'excellent';
  if (moyenne >= 14) return 'bien';
  if (moyenne >= 10) return 'passable';
  return 'insuffisant';
}

const BULLETIN_COL_PCTS = [28.18, 7.73, 7.73, 7.73, 6.36, 7.73, 6.36, 6.36, 17.27];
const BULLETIN_ANNUAL_COL_PCTS = [
  12, 5.5, 5.5, 5.5, 5.5, 5.5, 5.5,
  6.5, 5.5, 6.5, 5.5, 5.5, 5.5, 14.5,
];

function distributeSpans(nCols, parts) {
  const base = Math.floor(nCols / parts);
  const rem = nCols % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rem ? 1 : 0));
}

function BulletinColGroup({ annual = false }) {
  const pcts = annual ? BULLETIN_ANNUAL_COL_PCTS : BULLETIN_COL_PCTS;
  return (
    <colgroup>
      {pcts.map((pct, i) => (
        <col key={i} style={{ width: `${pct}%` }} />
      ))}
    </colgroup>
  );
}

function CameroonBulletinView({ bulletin }) {
  const isEn = bulletin.lang === 'en';
  const isAnnual = bulletin.bulletin_scope === 'annual';
  const nCols = isAnnual ? 14 : 9;
  const infoSpans = distributeSpans(nCols, 4);
  const summarySpans = distributeSpans(nCols, 6);
  const sigSpans = distributeSpans(nCols, 4);
  const infoRow2 = [
    infoSpans[0],
    infoSpans[1] + infoSpans[2],
    Math.max(1, Math.floor(infoSpans[3] / 2)),
    infoSpans[3] - Math.max(1, Math.floor(infoSpans[3] / 2)),
  ];
  const seqLabels = bulletin.sequence_labels || [bulletin.seq1_label, bulletin.seq2_label];
  const eleveName = (
    <strong>{bulletin.eleve_nom} {bulletin.eleve_prenom}</strong>
  );

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
      </div>

      <div className="bulletin-detail-table-wrap bulletin-cameroon-wrap">
        <table className={`bulletin-cameroon-grid${isAnnual ? ' bulletin-cameroon-annual' : ''}`}>
          <BulletinColGroup annual={isAnnual} />
          <tbody>
            <tr className="bulletin-title-row">
              <td colSpan={nCols}>
                {isEn ? "STUDENT'S PROGRESS REPORT CARD" : 'BULLETIN'}
              </td>
            </tr>

            {isEn ? (
              <>
                <tr className="bulletin-info-row">
                  <td colSpan={infoSpans[0]}><span className="cell-label">Name:</span> {eleveName}</td>
                  <td colSpan={infoSpans[1]}><span className="cell-label">Class:</span> {bulletin.classe || '—'}</td>
                  <td colSpan={infoSpans[2]}><span className="cell-label">Sex:</span> {bulletin.eleve_sexe || '—'}</td>
                  <td colSpan={infoSpans[3]}><span className="cell-label">Class Enrollment:</span> {bulletin.effectif || '—'}</td>
                </tr>
                <tr className="bulletin-info-row">
                  <td colSpan={infoRow2[0]}><span className="cell-label">Repeater:</span> {bulletin.redoublant || 'NO'}</td>
                  <td colSpan={infoRow2[1]}><span className="cell-label">Unique ID:</span> {bulletin.matricule || '—'}</td>
                  <td colSpan={infoRow2[2]}><span className="cell-label">Term:</span> <strong>{bulletin.term_label}</strong></td>
                  <td colSpan={infoRow2[3]}><span className="cell-label">Year:</span> <strong>{bulletin.annee_scolaire || '—'}</strong></td>
                </tr>
              </>
            ) : (
              <>
                <tr className="bulletin-info-row">
                  <td colSpan={infoSpans[0]}><span className="cell-label">NOM:</span> {eleveName}</td>
                  <td colSpan={infoSpans[1]}><span className="cell-label">Classe:</span> {bulletin.classe || '—'}</td>
                  <td colSpan={infoSpans[2]}><span className="cell-label">Effectif:</span> {bulletin.effectif || '—'}</td>
                  <td colSpan={infoSpans[3]}><span className="cell-label">Redoublant:</span> {bulletin.redoublant || 'NON'}</td>
                </tr>
                <tr className="bulletin-info-row">
                  <td colSpan={infoRow2[0]}><span className="cell-label">Serie:</span> {bulletin.classe_serie || '—'}</td>
                  <td colSpan={infoRow2[1]}><span className="cell-label">Matricule:</span> {bulletin.matricule || '—'}</td>
                  <td colSpan={infoRow2[2]}><strong>{bulletin.term_label}</strong></td>
                  <td colSpan={infoRow2[3]}><span className="cell-label">Annee</span> <strong>{bulletin.annee_scolaire || '—'}</strong></td>
                </tr>
              </>
            )}

            <tr className="bulletin-grades-header">
              <th>{isEn ? 'SUBJECTS' : 'MATIERE'}</th>
              {isAnnual
                ? seqLabels.map((label, idx) => <th key={label || idx}>{label}</th>)
                : (
                  <>
                    <th>{bulletin.seq1_label}</th>
                    <th>{bulletin.seq2_label}</th>
                  </>
                )}
              <th>{isEn ? 'Average' : 'Moyenne'}</th>
              <th>Coef</th>
              <th>{isEn ? 'Total marks' : 'Notes'}</th>
              <th>{isEn ? 'Rank' : 'Rang'}</th>
              <th>Appre.</th>
              <th>{isEn ? "Teacher's sign." : 'Professeur'}</th>
            </tr>

            {!bulletin.groupes_matieres?.length ? (
              <tr><td colSpan={nCols} className="bulletin-empty">Aucune note pour ce trimestre</td></tr>
            ) : (
              bulletin.groupes_matieres.map((group) => (
                <Fragment key={`g-${group.groupe}`}>
                  <tr className="bulletin-group-row">
                    <td colSpan={nCols}>{group.label}</td>
                  </tr>
                  {group.matieres.map((row) => (
                    <tr key={row.matiere_id || row.matiere} className="bulletin-grade-row">
                      <td className="matiere-cell">{row.matiere}</td>
                      {isAnnual
                        ? [1, 2, 3, 4, 5, 6].map((i) => <td key={i}>{row[`seq${i}`] ?? '—'}</td>)
                        : (
                          <>
                            <td>{row.seq1 ?? '—'}</td>
                            <td>{row.seq2 ?? '—'}</td>
                          </>
                        )}
                      <td>{row.moyenne ?? '—'}</td>
                      <td>{row.coef ?? '—'}</td>
                      <td>{row.points ?? '—'}</td>
                      <td>{row.rang_matiere ?? '—'}</td>
                      <td>
                        <span className={`appreciation-badge ${row.appreciation === 'A' ? 'app-a' : row.appreciation === 'ECA' || row.appreciation === 'IPA' ? 'app-eca' : 'app-na'}`}>
                          {row.appreciation}
                        </span>
                      </td>
                      <td className="prof-cell">{row.professeur}</td>
                    </tr>
                  ))}
                </Fragment>
              ))
            )}

            {isEn ? (
              <>
                <tr className="bulletin-summary-row">
                  <td colSpan={summarySpans[0]}><span className="cell-label">TOTAL</span><br />{bulletin.total_coef}</td>
                  <td colSpan={summarySpans[1]}><span className="cell-label">Total marks</span><br />{bulletin.total_points}</td>
                  <td colSpan={summarySpans[2]}><span className="cell-label">Class Average</span><br />{bulletin.moyenne_classe}</td>
                  <td colSpan={summarySpans[3]}><span className="cell-label">Term Average</span><br />{bulletin.moyenne_generale}</td>
                  <td colSpan={summarySpans[4]}><span className="cell-label">Position</span><br />{bulletin.rang_label || bulletin.rang || '—'}</td>
                  <td colSpan={summarySpans[5]}><span className="cell-label">Remark</span><br />{bulletin.decision}</td>
                </tr>
                <tr className="bulletin-summary-row">
                  <td colSpan={summarySpans[0] + summarySpans[1]}><span className="cell-label">Absences (hours)</span></td>
                  <td colSpan={summarySpans[2]}>{bulletin.absences ?? 0}</td>
                  <td colSpan={summarySpans[3]} />
                  <td colSpan={summarySpans[4]}><span className="cell-label">Sanctions</span><br />{bulletin.sanctions || ''}</td>
                  <td colSpan={summarySpans[5]}><span className="cell-label">Observation</span><br />{bulletin.observation || ''}</td>
                </tr>
                <tr className="bulletin-sig-row">
                  <td colSpan={sigSpans[0]}>PARENTS/GUARDIANS</td>
                  <td colSpan={sigSpans[1]}>S.D.M</td>
                  <td colSpan={sigSpans[2]}>PRINCIPAL</td>
                  <td colSpan={sigSpans[3]}>DATE</td>
                </tr>
                <tr className="bulletin-sig-space"><td colSpan={nCols}>&nbsp;</td></tr>
              </>
            ) : (
              <>
                <tr className="bulletin-summary-row">
                  <td colSpan={summarySpans[0]}><span className="cell-label">TOTAL</span><br />Coef: {bulletin.total_coef}</td>
                  <td colSpan={summarySpans[1]}>Notes: {bulletin.total_points}</td>
                  <td colSpan={summarySpans[2]}><span className="cell-label">Moyenne de la classe</span><br />{bulletin.moyenne_classe}</td>
                  <td colSpan={summarySpans[3]}><span className="cell-label">Moyenne</span><br />{bulletin.moyenne_generale}</td>
                  <td colSpan={summarySpans[4]}><span className="cell-label">Absences</span><br />{bulletin.absences ?? 0}</td>
                  <td colSpan={summarySpans[5]}><span className="cell-label">Rang</span><br />{bulletin.rang_label || bulletin.rang || '—'}</td>
                </tr>
                <tr className="bulletin-summary-row">
                  <td colSpan={summarySpans[0] + summarySpans[1]}><span className="cell-label">Decision</span><br />{bulletin.decision}</td>
                  <td colSpan={summarySpans[2] + summarySpans[3] + summarySpans[4]}><span className="cell-label">OBSERVATION</span><br />{bulletin.observation || ''}</td>
                  <td colSpan={summarySpans[5]} />
                </tr>
                <tr className="bulletin-sig-row">
                  <td colSpan={sigSpans[0]}>PARENTS/TUTEURS</td>
                  <td colSpan={sigSpans[1]}>PROF PRINCIPAL</td>
                  <td colSpan={sigSpans[2]}>PRINCIPAL</td>
                  <td colSpan={sigSpans[3]}>DATE</td>
                </tr>
                <tr className="bulletin-sig-space"><td colSpan={nCols}>&nbsp;</td></tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function BulletinDetail({ bulletin, onExportCsv, onExportPdf, onExportXlsx, exporting, readOnly = false }) {
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
