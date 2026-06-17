import { Fragment } from 'react';
import { TRIMESTRES } from '../utils/notes';
import { themeToCssVars } from '../utils/bulletinTheme';
import '../styles/bulletin-detail.css';

function getMentionClass(moyenne) {
  if (moyenne >= 16) return 'excellent';
  if (moyenne >= 14) return 'bien';
  if (moyenne >= 10) return 'passable';
  return 'insuffisant';
}

/** Proportions identiques au PDF (pdf.py _col_widths). */
function bulletinColPcts(nSeq) {
  const wSubj = 4.0;
  const wSeq = 1.25;
  const tail = [1.45, 0.95, 1.45, 1.05, 1.55];
  const tailSum = tail.reduce((a, b) => a + b, 0);
  let wProf = Math.max(2.8, 19.0 - wSubj - wSeq * nSeq - tailSum);
  const total = wSubj + wSeq * nSeq + tailSum + wProf;
  const widths = [wSubj, ...Array(nSeq).fill(wSeq), ...tail, wProf];
  return widths.map((w) => (w / total) * 100);
}

function BulletinColGroup({ nSeq }) {
  const pcts = bulletinColPcts(nSeq);
  return (
    <colgroup>
      {pcts.map((pct, i) => (
        <col key={i} style={{ width: `${pct}%` }} />
      ))}
    </colgroup>
  );
}

function distributeSpans(nCols, parts) {
  const base = Math.floor(nCols / parts);
  const rem = nCols % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rem ? 1 : 0));
}

const EN_HEAD = [
  'REPUBLIC OF CAMEROON',
  'Peace-Work-Fatherland',
  'MINISTRY OF SECONDARY EDUCATION',
];
const FR_HEAD = [
  'REPUBLIQUE DU CAMEROUN',
  'Paix-Travail-Patrie',
  'MINISTERE DE L\'ENSEIGNEMENT SECONDAIRE',
];

function NationalHeaderRow({ school, nCols }) {
  if (!school) return null;
  const schoolEn = (school.school_name || '').toUpperCase();
  const schoolFr = (school.school_name_fr || schoolEn).toUpperCase();
  const motto = school.motto || 'a chosen generation';
  const pobox = school.po_box || '';
  const regEn = school.delegation_regional || 'REGIONAL DELEGATION FOR CENTER';
  const depEn = school.delegation_departementale || 'DIVISIONAL DELEGATION FOR MEFOU AND AFAMBA';
  const regFr = school.delegation_regional_fr || 'DELEGATION REGIONALE DU CENTRE';
  const depFr = school.delegation_departementale_fr || 'DELEGATION DEPARTEMENTALE DE LA MEFOU ET AFAMBA';

  const sideSpan = Math.floor((nCols - 2) / 2);
  const frSpan = nCols - sideSpan - 2;
  const enLines = [...EN_HEAD, regEn, depEn, schoolEn, motto, pobox ? `PO BOX: ${pobox}` : ''].filter(Boolean);
  const frLines = [...FR_HEAD, regFr, depFr, schoolFr, motto, pobox ? `BP: ${pobox}` : ''].filter(Boolean);
  const schoolIdx = 5;
  const mottoIdx = 6;

  return (
    <tr className="bulletin-national-row">
      <td colSpan={sideSpan} className="national-side national-en">
        {enLines.map((line, i) => (
          <div key={i} className={i === schoolIdx ? 'school-name' : i === mottoIdx ? 'motto' : ''}>{line}</div>
        ))}
      </td>
      <td colSpan={2} className="national-logo">
        {school.logo_url ? (
          <img src={school.logo_url} alt="Logo établissement" />
        ) : (
          <div className="bulletin-logo-placeholder">{schoolEn.slice(0, 1) || 'R'}</div>
        )}
      </td>
      <td colSpan={frSpan} className="national-side national-fr">
        {frLines.map((line, i) => (
          <div key={i} className={i === schoolIdx ? 'school-name' : i === mottoIdx ? 'motto' : ''}>{line}</div>
        ))}
      </td>
    </tr>
  );
}

function SeqCells({ row, nSeq, isAnnual }) {
  if (isAnnual) {
    return Array.from({ length: nSeq }, (_, i) => (
      <td key={i}>{row[`seq${i + 1}`] ?? '—'}</td>
    ));
  }
  return (
    <>
      <td>{row.seq1 ?? '—'}</td>
      <td>{row.seq2 ?? '—'}</td>
    </>
  );
}

function ComplementarySubjectsTable({ bulletin, nSeq, isAnnual, isEn, L }) {
  const rows = bulletin.matieres_complementaires;
  if (!rows?.length) return null;

  const nCols = 1 + nSeq + 6;
  const title = bulletin.complementary_label || L.complementary || 'Matières complémentaires';

  return (
    <table className="bulletin-cameroon-grid bulletin-complementary-grid">
      <BulletinColGroup nSeq={nSeq} />
      <tbody>
        <tr className="bulletin-group-row">
          <td colSpan={nCols}>{title}</td>
        </tr>
        <tr className="bulletin-grades-header">
          <th>{L.subjects || (isEn ? 'SUBJECTS' : 'MATIÈRES')}</th>
          {isAnnual
            ? (bulletin.sequence_labels || []).map((label, idx) => <th key={label || idx}>{label}</th>)
            : (
              <>
                <th>{bulletin.seq1_label}</th>
                <th>{bulletin.seq2_label}</th>
              </>
            )}
          <th>{L.average || (isEn ? 'Average' : 'Moyenne')}</th>
          <th>{L.coefficient || 'Coef'}</th>
          <th>{L.total_marks || (isEn ? 'Total marks' : 'Notes')}</th>
          <th>{L.appreciation || 'Appre.'}</th>
        </tr>
        {rows.map((row) => (
          <tr key={row.matiere_id || row.matiere} className="bulletin-grade-row">
            <td className="matiere-cell">{row.matiere}</td>
            <SeqCells row={row} nSeq={nSeq} isAnnual={isAnnual} />
            <td>{row.moyenne ?? '—'}</td>
            <td>{row.coef ?? '—'}</td>
            <td>{row.points ?? '—'}</td>
            <td>{row.appreciation ?? '—'}</td>
            <td colSpan={2} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CameroonBulletinView({ bulletin }) {
  const isEn = bulletin.lang === 'en';
  const isAnnual = bulletin.bulletin_scope === 'annual';
  const L = bulletin.labels || {};
  const seqLabels = bulletin.sequence_labels || [bulletin.seq1_label, bulletin.seq2_label].filter(Boolean);
  const nSeq = isAnnual ? (seqLabels.length || 3) : 2;
  const nCols = 1 + nSeq + 6;
  const infoSpans = distributeSpans(nCols, 4);
  const sigSpans = distributeSpans(nCols, 4);
  const infoRow2 = [
    infoSpans[0],
    infoSpans[1] + infoSpans[2],
    Math.max(1, Math.floor(infoSpans[3] / 2)),
    infoSpans[3] - Math.max(1, Math.floor(infoSpans[3] / 2)),
  ];
  const eleveName = (
    <strong>{bulletin.eleve_nom} {bulletin.eleve_prenom}</strong>
  );
  const title = bulletin.report_title || (isEn ? "STUDENT'S PROGRESS REPORT CARD" : 'BULLETIN');
  const school = bulletin.school_header;
  const themeStyle = themeToCssVars(bulletin.bulletin_theme || school?.bulletin_theme);
  const termAvgLabel = isAnnual
    ? (L.annual_average || (isEn ? 'ANNUAL AVERAGE' : 'MOYENNE ANNUELLE'))
    : (L.term_average || (isEn ? 'TERM AVERAGE' : 'MOYENNE DU TRIMESTRE'));

  return (
    <div className="bulletin-official-sheet" style={themeStyle}>
      <div className="bulletin-detail-table-wrap bulletin-cameroon-wrap">
        <table className="bulletin-cameroon-grid">
          <BulletinColGroup nSeq={nSeq} />
          <tbody>
            <NationalHeaderRow school={school} nCols={nCols} />

            <tr className="bulletin-title-row">
              <td colSpan={nCols}>{title}</td>
            </tr>

            {isEn ? (
              <>
                <tr className="bulletin-info-row bulletin-info-row-a">
                  <td colSpan={infoSpans[0]}><span className="cell-label">{L.name || 'Name'}:</span> {eleveName}</td>
                  <td colSpan={infoSpans[1]}><span className="cell-label">{L.class || 'Class'}:</span> {bulletin.classe || '—'}</td>
                  <td colSpan={infoSpans[2]}><span className="cell-label">Sex:</span> {bulletin.eleve_sexe || '—'}</td>
                  <td colSpan={infoSpans[3]}><span className="cell-label">{L.class_enrollment || 'Class Enrollment'}:</span> {bulletin.effectif || '—'}</td>
                </tr>
                <tr className="bulletin-info-row bulletin-info-row-b">
                  <td colSpan={infoRow2[0]}><span className="cell-label">{L.repeater || 'Repeater'}:</span> {bulletin.redoublant || 'NO'}</td>
                  <td colSpan={infoRow2[1]}><span className="cell-label">{L.unique_id || 'Unique ID'}:</span> {bulletin.matricule || '—'}</td>
                  <td colSpan={infoRow2[2]}><span className="cell-label">{L.year || 'Year'}:</span> <strong>{bulletin.annee_scolaire || '—'}</strong></td>
                  <td colSpan={infoRow2[3]}><strong>{bulletin.term_label}</strong></td>
                </tr>
              </>
            ) : (
              <>
                <tr className="bulletin-info-row bulletin-info-row-a">
                  <td colSpan={infoSpans[0]}><span className="cell-label">{L.name || 'NOM'}:</span> {eleveName}</td>
                  <td colSpan={infoSpans[1]}><span className="cell-label">{L.class || 'CLASSE'}:</span> {bulletin.classe || '—'}</td>
                  <td colSpan={infoSpans[2]}><span className="cell-label">SEXE:</span> {bulletin.eleve_sexe || '—'}</td>
                  <td colSpan={infoSpans[3]} />
                </tr>
                <tr className="bulletin-info-row bulletin-info-row-b">
                  <td colSpan={infoRow2[0]}><span className="cell-label">{L.class_enrollment || 'EFFECTIF'}:</span> {bulletin.effectif || '—'}</td>
                  <td colSpan={infoRow2[1]}><span className="cell-label">{L.repeater || 'Redoublant'}:</span> {bulletin.redoublant || 'NON'}</td>
                  <td colSpan={infoRow2[2] + infoRow2[3]}><span className="cell-label">{L.series || 'Série'}:</span> {bulletin.classe_serie || '—'}</td>
                </tr>
                <tr className="bulletin-info-row bulletin-info-row-c">
                  <td colSpan={infoRow2[0]}><span className="cell-label">{L.unique_id || 'MATRICULE'}:</span> {bulletin.matricule || '—'}</td>
                  <td colSpan={infoRow2[1]}><strong>{bulletin.term_label}</strong></td>
                  <td colSpan={infoRow2[2] + infoRow2[3]}><span className="cell-label">{L.year || 'ANNÉE'}:</span> <strong>{bulletin.annee_scolaire || '—'}</strong></td>
                </tr>
              </>
            )}

            <tr className="bulletin-grades-header">
              <th>{L.subjects || (isEn ? 'SUBJECTS' : 'MATIÈRES')}</th>
              {isAnnual
                ? seqLabels.map((label, idx) => <th key={label || idx}>{label}</th>)
                : (
                  <>
                    <th>{bulletin.seq1_label}</th>
                    <th>{bulletin.seq2_label}</th>
                  </>
                )}
              <th>{L.average || (isEn ? 'Average' : 'Moyenne')}</th>
              <th>{L.coefficient || 'Coef'}</th>
              <th>{L.total_marks || (isEn ? 'Total marks' : 'Notes')}</th>
              <th>{L.rank || (isEn ? 'Rank' : 'Rang')}</th>
              <th>{L.appreciation || 'Appre.'}</th>
              <th>{L.teacher_sign || (isEn ? "Teacher's sign." : 'Professeur M./Mme')}</th>
            </tr>

            {!bulletin.groupes_matieres?.length ? (
              <tr className="bulletin-grade-row"><td colSpan={nCols} className="bulletin-empty">Aucune note pour ce trimestre</td></tr>
            ) : (
              bulletin.groupes_matieres.map((group) => (
                <Fragment key={`g-${group.groupe}`}>
                  <tr className="bulletin-group-row">
                    <td colSpan={nCols}>{group.label}</td>
                  </tr>
                  {group.matieres.map((row) => (
                    <tr key={row.matiere_id || row.matiere} className="bulletin-grade-row">
                      <td className="matiere-cell">{row.matiere}</td>
                      <SeqCells row={row} nSeq={nSeq} isAnnual={isAnnual} />
                      <td>{row.moyenne ?? '—'}</td>
                      <td>{row.coef ?? '—'}</td>
                      <td>{row.points ?? '—'}</td>
                      <td>{row.rang_matiere ?? '—'}</td>
                      <td>{row.appreciation ?? '—'}</td>
                      <td className="prof-cell">{row.professeur}</td>
                    </tr>
                  ))}
                </Fragment>
              ))
            )}

            {isEn ? (
              <>
                <tr className="bulletin-summary-row">
                  <td><span className="cell-label">{L.total || 'TOTAL'}</span></td>
                  <td colSpan={Math.max(1, Math.floor(nSeq / 2))}><span className="cell-label">{L.total || 'TOTAL'}</span><br />{bulletin.total_coef}</td>
                  <td colSpan={Math.max(1, Math.ceil(nSeq / 2))}><span className="cell-label">{L.total_marks || 'Total marks'}</span><br />{bulletin.total_points}</td>
                  <td colSpan={2}><span className="cell-label">{L.class_average || 'Class Average'}</span><br />{bulletin.moyenne_classe}</td>
                  <td colSpan={2}><span className="cell-label">{L.sanctions || 'Sanctions'}</span><br />{bulletin.sanctions || '0'}</td>
                </tr>
                <tr className="bulletin-summary-row">
                  <td colSpan={2}><span className="cell-label">{termAvgLabel}</span></td>
                  <td colSpan={2}>{bulletin.moyenne_generale}</td>
                  <td colSpan={2}>{bulletin.appreciation_generale || bulletin.mention || ''}</td>
                  <td colSpan={Math.max(1, nCols - 6)}><span className="cell-label">{L.absences || 'Absences (hours)'}</span><br />{bulletin.absences ?? 0}</td>
                </tr>
                <tr className="bulletin-summary-row">
                  <td colSpan={2}><span className="cell-label">{L.position || 'Position'}</span><br />{bulletin.rang_label || bulletin.rang || '—'}</td>
                  <td colSpan={2}><span className="cell-label">{L.out_of || 'OUT OF'}</span><br />{bulletin.effectif || '—'}</td>
                  <td colSpan={2}><span className="cell-label">{L.remark || 'Remark'}</span><br />{bulletin.decision}</td>
                  <td colSpan={Math.max(1, nCols - 6)} />
                </tr>
                <tr className="bulletin-summary-row bulletin-observation-row">
                  <td colSpan={nCols}><span className="cell-label">{L.observation || 'Observation'}</span><br />{bulletin.observation || ''}</td>
                </tr>
                <tr className="bulletin-sig-row">
                  <td colSpan={sigSpans[0]}>{L.parents || 'PARENTS/GUARDIANS'}</td>
                  <td colSpan={sigSpans[1]}>{L.sdm || 'S.D.M'}</td>
                  <td colSpan={sigSpans[2]}>{L.principal || 'PRINCIPAL'}</td>
                  <td colSpan={sigSpans[3]}>{L.date || 'DATE'}</td>
                </tr>
                <tr className="bulletin-sig-space"><td colSpan={nCols}>&nbsp;</td></tr>
              </>
            ) : (
              <>
                <tr className="bulletin-summary-row">
                  <td><span className="cell-label">{L.total || 'TOTAL'}</span></td>
                  <td colSpan={Math.max(1, Math.floor(nSeq / 2))}>{bulletin.total_coef}</td>
                  <td colSpan={Math.max(1, Math.ceil(nSeq / 2))}>{bulletin.total_points}</td>
                  <td colSpan={2}><span className="cell-label">{L.class_average || 'MOYENNE DE CLASSE'}</span><br />{bulletin.moyenne_classe}</td>
                  <td colSpan={2}><span className="cell-label">{L.sanctions || 'SANCTIONS'}</span><br />{bulletin.sanctions || '0'}</td>
                </tr>
                <tr className="bulletin-summary-row">
                  <td colSpan={2}><span className="cell-label">{termAvgLabel}</span></td>
                  <td colSpan={2}>{bulletin.moyenne_generale}</td>
                  <td colSpan={2}>{bulletin.appreciation_generale || bulletin.mention || ''}</td>
                  <td colSpan={Math.max(1, nCols - 6)}><span className="cell-label">{L.absences || 'Absences (heures)'}</span><br />{bulletin.absences ?? 0}</td>
                </tr>
                <tr className="bulletin-summary-row">
                  <td colSpan={2}><span className="cell-label">{L.position || 'RANG'}</span><br />{bulletin.rang_label || bulletin.rang || '—'}</td>
                  <td colSpan={2}><span className="cell-label">{L.class_enrollment || 'EFFECTIF'}</span><br />{bulletin.effectif || '—'}</td>
                  <td colSpan={2}><span className="cell-label">{L.remark || 'DÉCISION'}</span><br />{bulletin.decision}</td>
                  <td colSpan={Math.max(1, nCols - 6)} />
                </tr>
                <tr className="bulletin-summary-row bulletin-observation-row">
                  <td colSpan={nCols}><span className="cell-label">{L.observation || 'OBSERVATION'}</span><br />{bulletin.observation || ''}</td>
                </tr>
                <tr className="bulletin-sig-row">
                  <td colSpan={sigSpans[0]}>{L.parents || 'PARENTS/TUTEURS'}</td>
                  <td colSpan={sigSpans[1]}>
                    {L.principal_col || 'PROF PRINCIPAL'}
                    {school?.prof_principal && (
                      <div className="prof-principal-name">{school.prof_principal.toUpperCase()}</div>
                    )}
                  </td>
                  <td colSpan={sigSpans[2]}>{L.principal || 'PRINCIPAL'}</td>
                  <td colSpan={sigSpans[3]}>{L.date || 'DATE'}</td>
                </tr>
                <tr className="bulletin-sig-space"><td colSpan={nCols}>&nbsp;</td></tr>
              </>
            )}
          </tbody>
        </table>

        <ComplementarySubjectsTable
          bulletin={bulletin}
          nSeq={nSeq}
          isAnnual={isAnnual}
          isEn={isEn}
          L={L}
        />
      </div>
      {school?.next_term && (
        <p className="bulletin-next-term">
          {L.next_term || (isEn ? 'Next term re-opens' : 'Prochaine rentrée')}: {school.next_term}
        </p>
      )}
    </div>
  );
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
