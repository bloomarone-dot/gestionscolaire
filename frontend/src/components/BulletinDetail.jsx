import { Fragment } from 'react';
import { TRIMESTRES } from '../utils/notes';
import { themeToCssVars } from '../utils/bulletinTheme';
import {
  bulletinColCount,
  bulletinColPcts,
  complementaryColPcts,
  spanParts,
} from '../utils/bulletinLayout';
import '../styles/bulletin-detail.css';

function getMentionClass(moyenne) {
  if (moyenne >= 16) return 'excellent';
  if (moyenne >= 14) return 'bien';
  if (moyenne >= 10) return 'passable';
  return 'insuffisant';
}

function BulletinColGroup({ nSeq, variant = 'main' }) {
  const pcts = variant === 'complementary' ? complementaryColPcts(nSeq) : bulletinColPcts(nSeq);
  return (
    <colgroup>
      {pcts.map((pct, i) => (
        <col key={i} style={{ width: `${pct}%` }} />
      ))}
    </colgroup>
  );
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

function NationalHeaderBlock({ school }) {
  if (!school) return null;
  const schoolEn = (school.school_name || '').toUpperCase();
  const schoolFr = (school.school_name_fr || schoolEn).toUpperCase();
  const motto = school.motto || 'A Chosen Generation : Believe-Achieve-Succeed';
  const pobox = school.po_box || '';
  const regEn = school.delegation_regional || 'REGIONAL DELEGATION FOR CENTER';
  const depEn = school.delegation_departementale || 'DIVISIONAL DELEGATION FOR MEFOU AND AFAMBA';
  const regFr = school.delegation_regional_fr || 'DELEGATION REGIONALE DU CENTRE';
  const depFr = school.delegation_departementale_fr || 'DELEGATION DEPARTEMENTALE DE LA MEFOU ET AFAMBA';

  const enLines = [...EN_HEAD, regEn, depEn, schoolEn, motto, pobox ? `PO BOX: ${pobox}` : 'PO BOX:'].filter(Boolean);
  const frLines = [...FR_HEAD, regFr, depFr, schoolFr, motto, pobox ? `BP: ${pobox}` : 'BP:'].filter(Boolean);

  const schoolIdx = 5;
  const mottoIdx = 6;

  return (
    <table className="bulletin-national-grid">
      <tbody>
        <tr className="bulletin-national-row">
          <td className="national-side national-en">
            {enLines.map((line, i) => (
              <div
                key={`en-${i}`}
                className={i === schoolIdx ? 'school-name' : i === mottoIdx ? 'motto' : ''}
              >
                {line}
              </div>
            ))}
          </td>
          <td className="national-logo">
            {school.logo_url ? (
              <img src={school.logo_url} alt="Logo établissement" />
            ) : (
              <div className="bulletin-logo-placeholder">{schoolEn.slice(0, 1) || 'R'}</div>
            )}
          </td>
          <td className="national-side national-fr">
            {frLines.map((line, i) => (
              <div
                key={`fr-${i}`}
                className={i === schoolIdx ? 'school-name' : i === mottoIdx ? 'motto' : ''}
              >
                {line}
              </div>
            ))}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function TitleBar({ title }) {
  return (
    <table className="bulletin-title-grid">
      <tbody>
        <tr className="bulletin-title-row">
          <td>{title}</td>
        </tr>
      </tbody>
    </table>
  );
}

function SeqCells({ row, nSeq, isAnnual }) {
  if (isAnnual) {
    return Array.from({ length: nSeq }, (_, i) => (
      <td key={i}>{row[`seq${i + 1}`] ?? ''}</td>
    ));
  }
  return (
    <>
      <td>{row.seq1 ?? ''}</td>
      <td>{row.seq2 ?? ''}</td>
    </>
  );
}

function IdentityRows({ bulletin, isEn, L, nCols }) {
  const infoSpans = spanParts(nCols, 4);
  const row2 = [
    infoSpans[0],
    infoSpans[1] + infoSpans[2],
    Math.max(1, Math.floor(infoSpans[3] / 2)),
    infoSpans[3] - Math.max(1, Math.floor(infoSpans[3] / 2)),
  ];
  const eleveName = (
    <strong>
      {(bulletin.eleve_nom || '').toUpperCase()} {(bulletin.eleve_prenom || '').toUpperCase()}
    </strong>
  );

  if (isEn) {
    return (
      <>
        <tr className="bulletin-info-row bulletin-info-row-a">
          <td colSpan={infoSpans[0]} className="id-label">
            <span className="cell-label">{L.name || 'Name'}:</span> {eleveName}
          </td>
          <td colSpan={infoSpans[1]}>
            <span className="cell-label">{L.class || 'Class'}:</span> {bulletin.classe || ''}
          </td>
          <td colSpan={infoSpans[2]} className="id-label">
            <span className="cell-label">Sex:</span> {bulletin.eleve_sexe || ''}
          </td>
          <td colSpan={infoSpans[3]}>
            <span className="cell-label">{L.class_enrollment || 'Class Enrollment'}:</span> {bulletin.effectif ?? ''}
          </td>
        </tr>
        <tr className="bulletin-info-row bulletin-info-row-b">
          <td colSpan={row2[0]} className="id-row">
            <span className="cell-label">{L.repeater || 'Repeater'}:</span> {bulletin.redoublant || 'NO'}
          </td>
          <td colSpan={row2[1]} className="id-row">
            <span className="cell-label">{L.unique_id || 'Unique ID'}:</span> {bulletin.matricule || ''}
          </td>
          <td colSpan={row2[2]} className="id-row">
            <span className="cell-label">{L.year || 'Year'}:</span> <strong>{bulletin.annee_scolaire || ''}</strong>
          </td>
          <td colSpan={row2[3]} className="id-row term-cell">
            <strong>{bulletin.term_label}</strong>
          </td>
        </tr>
      </>
    );
  }

  return (
    <>
      <tr className="bulletin-info-row bulletin-info-row-a">
        <td colSpan={infoSpans[0]} className="id-label">
          <span className="cell-label">{L.name || 'NOM'}:</span> {eleveName}
        </td>
        <td colSpan={infoSpans[1]}>
          <span className="cell-label">{L.class || 'CLASSE'}:</span> {bulletin.classe || ''}
        </td>
        <td colSpan={infoSpans[2]} className="id-label">
          <span className="cell-label">SEXE:</span> {bulletin.eleve_sexe || ''}
        </td>
        <td colSpan={infoSpans[3]} />
      </tr>
      <tr className="bulletin-info-row bulletin-info-row-b">
        <td colSpan={row2[0]} className="id-row">
          <span className="cell-label">{L.class_enrollment || 'EFFECTIF'}:</span> {bulletin.effectif ?? ''}
        </td>
        <td colSpan={row2[1]} className="id-row">
          <span className="cell-label">{L.repeater || 'Redoublant'}:</span> {bulletin.redoublant || 'NON'}
        </td>
        <td colSpan={row2[2] + row2[3]} className="id-row">
          <span className="cell-label">{L.series || 'Série'}:</span> {bulletin.classe_serie || ''}
        </td>
      </tr>
      <tr className="bulletin-info-row bulletin-info-row-c">
        <td colSpan={row2[0]}>
          <span className="cell-label">{L.unique_id || 'MATRICULE'}:</span> {bulletin.matricule || ''}
        </td>
        <td colSpan={row2[1]} className="term-cell">
          <strong>{bulletin.term_label}</strong>
        </td>
        <td colSpan={row2[2] + row2[3]}>
          <span className="cell-label">{L.year || 'ANNÉE'}:</span> <strong>{bulletin.annee_scolaire || ''}</strong>
        </td>
      </tr>
    </>
  );
}

function SummaryRow({ cells, nCols, className = 'bulletin-summary-row' }) {
  const padded = [...cells];
  while (padded.length < nCols) padded.push(null);
  return (
    <tr className={className}>
      {padded.map((cell, i) => (
        <td key={i}>{cell}</td>
      ))}
    </tr>
  );
}

function FooterRows({ bulletin, isEn, isAnnual, L, nCols }) {
  const termAvgLabel = isAnnual
    ? (L.annual_average || (isEn ? 'ANNUAL AVERAGE' : 'MOYENNE ANNUELLE'))
    : (L.term_average || (isEn ? 'TERM AVERAGE' : 'MOYENNE DU TRIMESTRE'));

  if (isEn) {
    return (
      <>
        <SummaryRow
          nCols={nCols}
          cells={[
            <span key="t" className="cell-label">{L.total || 'TOTAL'}</span>,
            bulletin.total_coef ?? '',
            bulletin.total_points ?? '',
            <span key="ca" className="cell-label">{L.class_average || 'CLASS AVERAGE'}</span>,
            bulletin.moyenne_classe ?? '',
            <span key="s" className="cell-label">{L.sanctions || 'SANCTIONS'}</span>,
            '0',
            '0',
          ]}
        />
        <SummaryRow
          nCols={nCols}
          cells={[
            <span key="ta" className="cell-label">{termAvgLabel}</span>,
            bulletin.moyenne_generale ?? '',
            bulletin.appreciation_generale || bulletin.mention || '',
            <span key="ab" className="cell-label">{L.absences || 'Absences (hours)'}</span>,
            bulletin.absences ?? 0,
            '0',
          ]}
        />
        <SummaryRow
          nCols={nCols}
          cells={[
            <span key="p" className="cell-label">{L.position || 'POSITION'}</span>,
            bulletin.rang_label || bulletin.rang || '',
            <span key="o" className="cell-label">{L.out_of || 'OUT OF'}</span>,
            bulletin.effectif ?? '',
            <span key="rm" className="cell-label">{L.remark || 'REMARK'}</span>,
            bulletin.decision || '',
          ]}
        />
        <tr className="bulletin-summary-row bulletin-observation-row">
          <td colSpan={nCols}>
            <span className="cell-label">{L.observation || 'OBSERVATION'}</span>
            {bulletin.observation ? <><br />{bulletin.observation}</> : null}
          </td>
        </tr>
      </>
    );
  }

  return (
    <>
      <SummaryRow
        nCols={nCols}
        cells={[
          <span key="t" className="cell-label">{L.total || 'TOTAL'}</span>,
          bulletin.total_coef ?? '',
          bulletin.total_points ?? '',
          <span key="ca" className="cell-label">{L.class_average || 'MOYENNE DE CLASSE'}</span>,
          bulletin.moyenne_classe ?? '',
          <span key="s" className="cell-label">{L.sanctions || 'SANCTIONS'}</span>,
          bulletin.sanctions || '0',
          '0',
        ]}
      />
      <SummaryRow
        nCols={nCols}
        cells={[
          <span key="ta" className="cell-label">{termAvgLabel}</span>,
          bulletin.moyenne_generale ?? '',
          bulletin.appreciation_generale || bulletin.mention || '',
          <span key="ab" className="cell-label">{L.absences || 'Absences (heures)'}</span>,
          bulletin.absences ?? 0,
        ]}
      />
      <SummaryRow
        nCols={nCols}
        cells={[
          <span key="p" className="cell-label">{L.position || 'RANG'}</span>,
          bulletin.rang_label || bulletin.rang || '',
          <span key="ef" className="cell-label">{L.class_enrollment || 'EFFECTIF'}</span>,
          bulletin.effectif ?? '',
          <span key="rm" className="cell-label">{L.remark || 'DÉCISION'}</span>,
          bulletin.decision || '',
        ]}
      />
      <tr className="bulletin-summary-row bulletin-observation-row">
        <td colSpan={nCols}>
          <span className="cell-label">{L.observation || 'OBSERVATION'}</span>
          {bulletin.observation ? <><br />{bulletin.observation}</> : null}
        </td>
      </tr>
    </>
  );
}

function SignaturesBlock({ school, isEn, L }) {
  const heads = isEn
    ? [L.parents || 'PARENTS/GUARDIANS', L.sdm || 'S.D.M', L.principal || 'PRINCIPAL', L.date || 'DATE']
    : [L.parents || 'PARENTS/TUTEURS', L.principal_col || 'PROF PRINCIPAL', L.principal || 'PRINCIPAL', L.date || 'DATE'];

  return (
    <table className="bulletin-signatures-grid">
      <tbody>
        <tr className="bulletin-sig-row">
          {heads.map((h) => (
            <td key={h}>{h}</td>
          ))}
        </tr>
        <tr className="bulletin-sig-space">
          <td />
          <td>
            {school?.prof_principal && (
              <div className="prof-principal-name">{school.prof_principal.toUpperCase()}</div>
            )}
          </td>
          <td />
          <td />
        </tr>
      </tbody>
    </table>
  );
}

function ComplementarySubjectsTable({ bulletin, nSeq, isAnnual, isEn, L }) {
  const rows = bulletin.matieres_complementaires;
  if (!rows?.length) return null;

  const title = bulletin.complementary_label || L.complementary || 'Matières complémentaires de l\'établissement';

  return (
    <table className="bulletin-cameroon-grid bulletin-complementary-grid">
      <BulletinColGroup nSeq={nSeq} variant="complementary" />
      <tbody>
        <tr className="bulletin-group-row">
          <td colSpan={nSeq + 6}>{title}</td>
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
          <th>{L.appreciation || 'Appr.'}</th>
        </tr>
        {rows.map((row) => (
          <tr key={row.matiere_id || row.matiere} className="bulletin-grade-row">
            <td className="matiere-cell">{row.matiere}</td>
            <SeqCells row={row} nSeq={nSeq} isAnnual={isAnnual} />
            <td>{row.moyenne ?? ''}</td>
            <td>{row.coef ?? ''}</td>
            <td>{row.points ?? ''}</td>
            <td>{row.appreciation ?? ''}</td>
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
  const nCols = bulletinColCount(nSeq);
  const title = bulletin.report_title || (isEn ? "STUDENT'S PROGRESS REPORT CARD" : 'BULLETIN');
  const school = bulletin.school_header;
  const themeStyle = themeToCssVars(bulletin.bulletin_theme || school?.bulletin_theme);

  return (
    <div className="bulletin-official-sheet" style={themeStyle}>
      <NationalHeaderBlock school={school} />
      <TitleBar title={title} />

      <table className="bulletin-cameroon-grid bulletin-main-grid">
        <BulletinColGroup nSeq={nSeq} />
        <tbody>
          <IdentityRows bulletin={bulletin} isEn={isEn} L={L} nCols={nCols} />

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
            <th>{L.appreciation || 'Appr.'}</th>
            <th>{L.teacher_sign || (isEn ? "Teacher's sign." : 'Professeur M./Mme')}</th>
          </tr>

          {!bulletin.groupes_matieres?.length ? (
            <tr className="bulletin-grade-row">
              <td colSpan={nCols} className="bulletin-empty">Aucune note pour ce trimestre</td>
            </tr>
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
                    <td>{row.moyenne ?? ''}</td>
                    <td>{row.coef ?? ''}</td>
                    <td>{row.points ?? ''}</td>
                    <td>{row.rang_matiere ?? ''}</td>
                    <td>{row.appreciation ?? ''}</td>
                    <td className="prof-cell">{row.professeur}</td>
                  </tr>
                ))}
              </Fragment>
            ))
          )}

          <FooterRows
            bulletin={bulletin}
            isEn={isEn}
            isAnnual={isAnnual}
            L={L}
            nCols={nCols}
          />
        </tbody>
      </table>

      <ComplementarySubjectsTable
        bulletin={bulletin}
        nSeq={nSeq}
        isAnnual={isAnnual}
        isEn={isEn}
        L={L}
      />

      <SignaturesBlock school={school} isEn={isEn} L={L} />

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
