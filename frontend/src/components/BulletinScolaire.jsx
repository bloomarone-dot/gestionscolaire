import React, { useMemo } from 'react';
import { mapBulletinScolaire } from '../utils/mapBulletinScolaire';
import { bulletinScolaireStyles as styles } from '../styles/bulletinScolaireStyles';

function LogoPlaceholder() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" aria-hidden="true">
      <circle cx="30" cy="30" r="28" fill="#1a3a5c" stroke="#fff" strokeWidth="2" />
      <text x="30" y="22" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">ROYAL</text>
      <text x="30" y="32" textAnchor="middle" fill="white" fontSize="7">PRIESTHOOD</text>
      <text x="30" y="42" textAnchor="middle" fill="#d4af37" fontSize="7">RP</text>
    </svg>
  );
}

function SubjectRow({ subject }) {
  return (
    <tr>
      <td style={styles.subjectCell}>{subject.name}</td>
      {subject.seqs.map((seq, i) => (
        <td key={i} style={styles.dataCell}>{seq}</td>
      ))}
      <td style={styles.dataCell}>{subject.avg}</td>
      <td style={styles.dataCell}>{subject.coef}</td>
      <td style={styles.dataCell}>{subject.total}</td>
      <td style={styles.dataCell}>{subject.rank}</td>
      <td style={styles.dataCell}>{subject.appre}</td>
      <td style={styles.teacherCell}>{subject.teacher}</td>
    </tr>
  );
}

function IdentityAnglo({ data, L }) {
  const { student, colCount, seqLabels, columns } = data;
  const innerColCount = colCount - 3;

  return (
    <>
      <tr>
        <td style={{ ...styles.nameRow, width: '8%' }}>{L.name || 'NAME'}:</td>
        <td colSpan={5} style={styles.nameValue}>{student.name}</td>
        <td style={{ ...styles.nameRow, width: '14%', textAlign: 'center' }}>{L.class || 'CLASS'}:</td>
        <td style={styles.nameValue}>{student.class}</td>
        <td style={{ ...styles.nameRow, textAlign: 'center' }}>{student.gender}</td>
      </tr>
      <tr>
        <td colSpan={2} style={styles.infoLabelCell}>
          {L.class_enrollment || 'CLASS ENROLLMENT'}: {student.enrollment}
        </td>
        <td colSpan={3} style={styles.infoValueCell}>
          {L.repeater || 'Repeater'}: {student.repeater}
        </td>
        <td colSpan={2} style={styles.infoLabelCell}>{student.term}</td>
        <td colSpan={2} style={styles.infoLabelCell}>{L.year || 'YEAR'}: {student.year}</td>
      </tr>
      <tr>
        <td style={styles.infoLabelCell}>{L.unique_id || 'UNIQUE ID'}</td>
        <td colSpan={2} style={styles.infoValueCell}>{student.uniqueId}</td>
        <td colSpan={innerColCount} style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                {seqLabels.map((label) => (
                  <td key={label} style={styles.colHeader}>{label}</td>
                ))}
                <td style={styles.colHeader}>{columns.average}</td>
                <td style={styles.colHeader}>{columns.coef}</td>
                <td style={styles.colHeader}>{columns.totalMarks}</td>
                <td style={styles.colHeader}>{columns.rank}</td>
                <td style={styles.colHeader}>{columns.appreciation}</td>
                <td style={styles.colHeader}>{columns.teacher}</td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </>
  );
}

function IdentityFranco({ data, L }) {
  const { student, colCount, seqLabels, columns } = data;

  return (
    <>
      <tr>
        <td colSpan={3} style={styles.infoLabelCell}>
          {L.name || 'NOM'}: <strong>{student.name}</strong>
        </td>
        <td colSpan={3} style={styles.infoValueCell}>
          {L.class || 'CLASSE'}: {student.class}
        </td>
        <td colSpan={3} style={styles.infoLabelCell}>SEXE: {student.gender}</td>
      </tr>
      <tr>
        <td colSpan={3} style={styles.infoValueCell}>
          {L.class_enrollment || 'EFFECTIF'}: {student.enrollment}
        </td>
        <td colSpan={3} style={styles.infoValueCell}>
          {L.repeater || 'Redoublant'}: {student.repeater}
        </td>
        <td colSpan={3} style={styles.infoValueCell}>
          {L.series || 'Série'}: {student.series}
        </td>
      </tr>
      <tr>
        <td colSpan={3} style={styles.infoValueCell}>
          {L.unique_id || 'MATRICULE'}: {student.uniqueId}
        </td>
        <td colSpan={3} style={{ ...styles.infoLabelCell, textAlign: 'center' }}>{student.term}</td>
        <td colSpan={3} style={styles.infoValueCell}>
          {L.year || 'ANNÉE'}: {student.year}
        </td>
      </tr>
      <tr>
        <td style={styles.colHeader}>{columns.subjects}</td>
        {seqLabels.map((label) => (
          <td key={label} style={styles.colHeader}>{label}</td>
        ))}
        <td style={styles.colHeader}>{columns.average}</td>
        <td style={styles.colHeader}>{columns.coef}</td>
        <td style={styles.colHeader}>{columns.totalMarks}</td>
        <td style={styles.colHeader}>{columns.rank}</td>
        <td style={styles.colHeader}>{columns.appreciation}</td>
        <td style={styles.colHeader}>{columns.teacher}</td>
      </tr>
    </>
  );
}

function SummaryRows({ data }) {
  const { summary, colCount, L, lang } = data;
  const s = summary;

  if (lang === 'en') {
    return (
      <>
        <tr>
          <td colSpan={3} style={styles.totalRow}>{L.total || 'TOTAL'}</td>
          <td style={styles.totalRow} />
          <td style={styles.totalRow}>{s.totalCoef}</td>
          <td style={styles.totalRow}>{s.totalMarks}</td>
          <td colSpan={2} style={styles.totalRow}>{L.class_average || 'CLASS AVERAGE'}</td>
          <td style={styles.totalRow}>
            {s.classAverage}
            <span style={{ float: 'right', fontWeight: 'normal', fontSize: '8px' }}>
              {L.sanctions || 'SANCTIONS'}
            </span>
          </td>
        </tr>
        <tr>
          <td style={styles.summaryLabelCell}>{s.termAvgLabel}</td>
          <td colSpan={2} style={styles.summaryValueCell}>{s.termAverage}</td>
          <td colSpan={2} style={styles.summaryValueCell}>{s.appreciation}</td>
          <td colSpan={2} style={styles.summaryLabelCell}>{L.absences || 'Absences (hours)'}</td>
          <td style={styles.summaryValueCell}>{s.absences === '' ? '0' : s.absences}</td>
          <td style={styles.summaryValueCell}>0</td>
        </tr>
        <tr>
          <td style={styles.summaryLabelCell}>{L.position || 'POSITION'}</td>
          <td style={styles.summaryValueCell}>{s.position}</td>
          <td style={styles.summaryLabelCell}>{L.out_of || 'OUT OF'}</td>
          <td style={styles.summaryValueCell}>{s.outOf}</td>
          <td style={styles.summaryLabelCell}>{L.remark || 'REMARK'}</td>
          <td colSpan={colCount - 5} style={styles.summaryValueCell}>{s.remark}</td>
        </tr>
        <tr>
          <td style={styles.summaryLabelCell}>{L.observation || 'OBSERVATION'}</td>
          <td colSpan={colCount - 1} style={{ ...styles.summaryValueCell, minHeight: '20px', textAlign: 'left' }}>
            {s.observation}
          </td>
        </tr>
      </>
    );
  }

  return (
    <>
      <tr>
        <td colSpan={3} style={styles.totalRow}>{L.total || 'TOTAL'}</td>
        <td style={styles.totalRow} />
        <td style={styles.totalRow}>{s.totalCoef}</td>
        <td style={styles.totalRow}>{s.totalMarks}</td>
        <td colSpan={2} style={styles.totalRow}>{L.class_average || 'MOYENNE DE CLASSE'}</td>
        <td style={styles.totalRow}>
          {s.classAverage}
          <span style={{ float: 'right', fontWeight: 'normal', fontSize: '8px' }}>
            {L.sanctions || 'SANCTIONS'} {s.sanctions}
          </span>
        </td>
      </tr>
      <tr>
        <td style={styles.summaryLabelCell}>{s.termAvgLabel}</td>
        <td colSpan={2} style={styles.summaryValueCell}>{s.termAverage}</td>
        <td colSpan={2} style={styles.summaryValueCell}>{s.appreciation}</td>
        <td colSpan={2} style={styles.summaryLabelCell}>{L.absences || 'Absences (heures)'}</td>
        <td style={styles.summaryValueCell}>{s.absences === '' ? '0' : s.absences}</td>
        <td style={styles.summaryValueCell} />
      </tr>
      <tr>
        <td style={styles.summaryLabelCell}>{L.position || 'RANG'}</td>
        <td style={styles.summaryValueCell}>{s.position}</td>
        <td style={styles.summaryLabelCell}>{L.class_enrollment || 'EFFECTIF'}</td>
        <td style={styles.summaryValueCell}>{s.outOf}</td>
        <td style={styles.summaryLabelCell}>{L.remark || 'DÉCISION'}</td>
        <td colSpan={colCount - 5} style={styles.summaryValueCell}>{s.remark}</td>
      </tr>
      <tr>
        <td style={styles.summaryLabelCell}>{L.observation || 'OBSERVATION'}</td>
        <td colSpan={colCount - 1} style={{ ...styles.summaryValueCell, minHeight: '20px', textAlign: 'left' }}>
          {s.observation}
        </td>
      </tr>
    </>
  );
}

export default function BulletinScolaire({ bulletin }) {
  const data = useMemo(() => mapBulletinScolaire(bulletin), [bulletin]);
  if (!data) return null;

  const { school, colCount, lang, groups, signatures, nextTermPrefix } = data;
  const isEn = lang === 'en';

  return (
    <div style={styles.page} className="bulletin-scolaire-sheet">
      <div style={styles.headerRow}>
        <div style={styles.headerText}>
          <div style={styles.bold}>REPUBLIC OF CAMEROON</div>
          <div>Peace-Work-Fatherland</div>
          <div style={styles.bold}>{school.ministryEn}</div>
          <div style={styles.bold}>{school.regionEn}</div>
          <div style={styles.bold}>{school.divisionEn}</div>
          <div style={{ ...styles.bold, fontSize: '10px', marginTop: '2px' }}>{school.nameEn}</div>
          <div style={{ fontStyle: 'italic' }}>{school.taglineEn}</div>
          <div>{school.poboxEn}</div>
        </div>

        <div style={styles.logoBox}>
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="Logo" style={styles.logoImg} />
          ) : (
            <LogoPlaceholder />
          )}
        </div>

        <div style={{ ...styles.headerText, textAlign: 'right' }}>
          <div style={styles.bold}>REPUBLIQUE DU CAMEROUN</div>
          <div>Paix-Travail-Patrie</div>
          <div style={styles.bold}>{school.ministryFr}</div>
          <div style={styles.bold}>{school.regionFr}</div>
          <div style={styles.bold}>{school.divisionFr}</div>
          <div style={{ ...styles.bold, fontSize: '10px', marginTop: '2px' }}>{school.nameFr}</div>
          <div style={{ fontStyle: 'italic' }}>{school.taglineFr}</div>
          <div>{school.bpFr}</div>
        </div>
      </div>

      <table style={styles.table}>
        <tbody>
          <tr>
            <td colSpan={colCount} style={styles.titleCell}>{data.reportTitle}</td>
          </tr>
          {isEn ? <IdentityAnglo data={data} L={data.L} /> : <IdentityFranco data={data} L={data.L} />}
        </tbody>
      </table>

      <table style={{ ...styles.table, marginTop: '-1px' }}>
        <colgroup>
          <col style={{ width: '22%' }} />
          {Array.from({ length: data.nSeq }).map((_, i) => (
            <col key={i} style={{ width: '7%' }} />
          ))}
          <col style={{ width: '7%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '30%' }} />
        </colgroup>
        <tbody>
          {groups.length === 0 ? (
            <tr>
              <td colSpan={colCount} style={styles.dataCell}>Aucune note pour ce trimestre</td>
            </tr>
          ) : (
            groups.map((group) => (
              <React.Fragment key={group.label}>
                <tr>
                  <td colSpan={colCount} style={styles.groupHeader}>{group.label}</td>
                </tr>
                {group.subjects.map((s, i) => (
                  <SubjectRow key={`${group.label}-${i}`} subject={s} />
                ))}
              </React.Fragment>
            ))
          )}

          <SummaryRows data={data} />
        </tbody>
      </table>

      <div style={styles.footerRow}>
        {signatures.map((label, i) => (
          <div key={label} style={styles.footerCell}>
            <span style={{ fontWeight: 'bold', fontSize: '9.5px' }}>{label}</span>
            {i === 1 && school.profPrincipal && (
              <div style={{ marginTop: '4px', fontSize: '9px' }}>{school.profPrincipal.toUpperCase()}</div>
            )}
          </div>
        ))}
      </div>

      {school.nextTermNote && (
        <div style={styles.nextTerm}>
          {nextTermPrefix}: <strong>{school.nextTermNote}</strong>
        </div>
      )}
    </div>
  );
}
