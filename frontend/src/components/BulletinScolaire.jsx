import React, { useMemo } from 'react';
import { mapBulletinScolaire } from '../utils/mapBulletinScolaire';
import { bulletinColPcts, bulletinSummaryCols } from '../utils/bulletinLayout';

const C = {
  headerBg: '#4a6fa5',
  groupBg: '#4a6fa5',
  subjectBg: '#c8d8e8',
  borderDark: '#2c3e6b',
  white: '#ffffff',
  black: '#000000',
  summaryPeach: '#fce5cd',
};

const styles = {
  page: {
    fontFamily: "'Arial', 'Helvetica', sans-serif",
    fontSize: '10px',
    color: C.black,
    backgroundColor: C.white,
    padding: '12px',
    width: '100%',
    maxWidth: '210mm',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
    gap: '8px',
  },
  headerText: {
    fontSize: '9px',
    lineHeight: '1.4',
    flex: 1,
    textAlign: 'center',
  },
  bold: { fontWeight: 'bold' },
  logoBox: {
    width: '96px',
    height: '112px',
    border: `2px solid ${C.borderDark}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    background: C.white,
  },
  logoImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    display: 'block',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    border: `1.5px solid ${C.borderDark}`,
    tableLayout: 'fixed',
  },
  titleCell: {
    backgroundColor: C.headerBg,
    color: C.white,
    fontWeight: 'bold',
    fontSize: '13px',
    textAlign: 'center',
    padding: '5px',
    border: `1px solid ${C.borderDark}`,
    letterSpacing: '1px',
  },
  nameRow: {
    backgroundColor: C.headerBg,
    color: C.white,
    fontWeight: 'bold',
    padding: '4px 6px',
    border: `1px solid ${C.borderDark}`,
    fontSize: '11px',
  },
  nameValue: {
    backgroundColor: C.white,
    color: C.black,
    fontWeight: 'bold',
    fontSize: '14px',
    letterSpacing: '0.5px',
    padding: '4px 8px',
    border: `1px solid ${C.borderDark}`,
  },
  infoLabelCell: {
    backgroundColor: C.headerBg,
    color: C.white,
    fontWeight: 'bold',
    padding: '3px 6px',
    border: `1px solid ${C.borderDark}`,
    whiteSpace: 'nowrap',
    fontSize: '9.5px',
  },
  infoValueCell: {
    backgroundColor: C.white,
    padding: '3px 6px',
    border: `1px solid ${C.borderDark}`,
    fontSize: '9.5px',
    fontWeight: 'bold',
  },
  colHeader: {
    backgroundColor: C.headerBg,
    color: C.white,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: '3px 2px',
    border: `1px solid ${C.borderDark}`,
    fontSize: '9px',
  },
  groupHeader: {
    backgroundColor: C.groupBg,
    color: C.white,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: '3px',
    border: `1px solid ${C.borderDark}`,
    fontSize: '10px',
    letterSpacing: '0.5px',
  },
  subjectCell: {
    backgroundColor: C.subjectBg,
    padding: '3px 6px',
    border: `1px solid ${C.borderDark}`,
    fontSize: '9.5px',
    fontWeight: 'bold',
    color: '#1a3a5c',
  },
  dataCell: {
    backgroundColor: C.white,
    textAlign: 'center',
    padding: '3px 2px',
    border: `1px solid ${C.borderDark}`,
    fontSize: '9.5px',
  },
  teacherCell: {
    backgroundColor: C.white,
    textAlign: 'center',
    padding: '3px 4px',
    border: `1px solid ${C.borderDark}`,
    fontSize: '9px',
    fontWeight: 'bold',
  },
  totalLabelCell: {
    backgroundColor: C.summaryPeach,
    color: C.black,
    fontWeight: 'bold',
    textAlign: 'right',
    padding: '4px 6px',
    border: `1px solid ${C.borderDark}`,
    fontSize: '10px',
  },
  totalValueCell: {
    backgroundColor: C.summaryPeach,
    color: C.black,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: '4px 2px',
    border: `1px solid ${C.borderDark}`,
    fontSize: '10px',
  },
  summaryLabelCell: {
    backgroundColor: C.headerBg,
    color: C.white,
    fontWeight: 'bold',
    padding: '4px 6px',
    border: `1px solid ${C.borderDark}`,
    fontSize: '10px',
  },
  summaryValueCell: {
    backgroundColor: C.summaryPeach,
    color: C.black,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: '4px 6px',
    border: `1px solid ${C.borderDark}`,
    fontSize: '10px',
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '4px',
    gap: '4px',
  },
  footerCell: {
    flex: 1,
    border: `1px solid ${C.borderDark}`,
    padding: '30px 6px 4px',
    fontSize: '9.5px',
    fontWeight: 'bold',
    minHeight: '50px',
    backgroundColor: C.white,
  },
  nextTerm: {
    marginTop: '6px',
    fontSize: '9.5px',
    fontWeight: 'bold',
  },
};

function ColGroup({ nSeq }) {
  const pcts = bulletinColPcts(nSeq);
  return (
    <colgroup>
      {pcts.map((pct, i) => (
        <col key={i} style={{ width: `${pct}%` }} />
      ))}
    </colgroup>
  );
}

function SubjectRow({ s }) {
  return (
    <tr>
      <td style={styles.subjectCell}>{s.name}</td>
      <td style={styles.dataCell}>{s.seq3 ?? ''}</td>
      <td style={styles.dataCell}>{s.seq4 ?? ''}</td>
      <td style={styles.dataCell}>{s.avg ?? ''}</td>
      <td style={styles.dataCell}>{s.coef}</td>
      <td style={styles.dataCell}>{s.total ?? ''}</td>
      <td style={styles.dataCell}>{s.rank}</td>
      <td style={styles.dataCell}>{s.appre}</td>
      <td style={styles.teacherCell}>{s.teacher}</td>
    </tr>
  );
}

function SummaryRows({ summary, labels, cols }) {
  const { coefCol, teacherCol } = cols;

  return (
    <>
      <tr>
        <td colSpan={coefCol} style={styles.totalLabelCell}>{labels.total}</td>
        <td style={styles.totalValueCell}>{summary.totalCoef ?? ''}</td>
        <td style={styles.totalValueCell}>{summary.totalMarks ?? ''}</td>
        <td style={styles.totalValueCell}>{labels.classAverage}</td>
        <td style={styles.totalValueCell}>{summary.classAverage ?? ''}</td>
        <td style={styles.totalValueCell}>{labels.sanctions}</td>
      </tr>

      <tr>
        <td style={styles.summaryLabelCell}>{labels.termAverage}</td>
        <td colSpan={3} style={styles.summaryValueCell}>{summary.termAverage ?? ''}</td>
        <td style={styles.summaryValueCell}>{summary.appreciation ?? ''}</td>
        <td colSpan={2} style={styles.summaryLabelCell}>{labels.absences}</td>
        <td style={styles.summaryValueCell}>{summary.absences ?? '0'}</td>
        <td style={styles.summaryValueCell}>0</td>
      </tr>

      <tr>
        <td style={styles.summaryLabelCell}>{labels.position}</td>
        <td style={styles.summaryValueCell}>{summary.position ?? ''}</td>
        <td style={styles.summaryLabelCell}>{labels.outOf}</td>
        <td style={styles.summaryValueCell}>{summary.outOf ?? ''}</td>
        <td style={styles.summaryLabelCell}>{labels.remark}</td>
        <td colSpan={teacherCol - 4} style={styles.summaryValueCell}>{summary.remark ?? ''}</td>
      </tr>

      <tr>
        <td style={styles.summaryLabelCell}>{labels.observation}</td>
        <td colSpan={teacherCol} style={{ ...styles.summaryValueCell, textAlign: 'left', minHeight: '24px' }}>
          {summary.observation}
        </td>
      </tr>
    </>
  );
}

export default function BulletinScolaire({ bulletin }) {
  const data = useMemo(() => mapBulletinScolaire(bulletin), [bulletin]);
  if (!data) return null;

  const { school, student, subjects, summary, groupLabels, seqLabel1, seqLabel2, labels } = data;
  const nSeq = 2;
  const cols = bulletinSummaryCols(nSeq);
  const allColspan = cols.nCols;

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
            <svg viewBox="0 0 60 60" width="60" height="60">
              <circle cx="30" cy="30" r="28" fill="#1a3a5c" stroke="#fff" strokeWidth="2" />
              <text x="30" y="22" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">ROYAL</text>
              <text x="30" y="32" textAnchor="middle" fill="white" fontSize="7">PRIESTHOOD</text>
              <text x="30" y="42" textAnchor="middle" fill="#d4af37" fontSize="7">RP</text>
            </svg>
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
        <ColGroup nSeq={nSeq} />
        <tbody>
          <tr>
            <td colSpan={allColspan} style={styles.titleCell}>
              STUDENT&apos;S PROGRESS REPORT CARD
            </td>
          </tr>

          <tr>
            <td style={{ ...styles.nameRow, width: '8%' }}>NAME:</td>
            <td colSpan={5} style={styles.nameValue}>{student.name}</td>
            <td style={{ ...styles.nameRow, textAlign: 'center' }}>CLASS:</td>
            <td style={styles.nameValue}>{student.class}</td>
            <td style={{ ...styles.nameRow, textAlign: 'center' }}>{student.gender}</td>
          </tr>

          <tr>
            <td colSpan={2} style={styles.infoLabelCell}>CLASS ENROLLMENT: {student.enrollment}</td>
            <td colSpan={3} style={styles.infoValueCell}>Repeater: {student.repeater}</td>
            <td colSpan={2} style={styles.infoLabelCell}>{student.term}</td>
            <td colSpan={2} style={styles.infoLabelCell}>YEAR: {student.year}</td>
          </tr>

          <tr>
            <td style={styles.infoLabelCell}>UNIQUE ID</td>
            <td colSpan={8} style={styles.infoValueCell}>{student.uniqueId}</td>
          </tr>

          <tr>
            <td style={styles.colHeader} />
            <td style={styles.colHeader}>{seqLabel1}</td>
            <td style={styles.colHeader}>{seqLabel2}</td>
            <td style={styles.colHeader}>Average</td>
            <td style={styles.colHeader}>Coef</td>
            <td style={styles.colHeader}>Total marks</td>
            <td style={styles.colHeader}>Rank</td>
            <td style={styles.colHeader}>Appre.</td>
            <td style={styles.colHeader}>Teacher&apos;s sign.(MR/MRS/MISS)</td>
          </tr>

          {subjects.firstGroup.length > 0 && (
            <>
              <tr>
                <td colSpan={allColspan} style={styles.groupHeader}>{groupLabels.first}</td>
              </tr>
              {subjects.firstGroup.map((s, i) => <SubjectRow key={`g1-${i}`} s={s} />)}
            </>
          )}

          {subjects.secondGroup.length > 0 && (
            <>
              <tr>
                <td colSpan={allColspan} style={styles.groupHeader}>{groupLabels.second}</td>
              </tr>
              {subjects.secondGroup.map((s, i) => <SubjectRow key={`g2-${i}`} s={s} />)}
            </>
          )}

          {subjects.thirdGroup.length > 0 && (
            <>
              <tr>
                <td colSpan={allColspan} style={styles.groupHeader}>{groupLabels.third}</td>
              </tr>
              {subjects.thirdGroup.map((s, i) => <SubjectRow key={`g3-${i}`} s={s} />)}
            </>
          )}

          <SummaryRows summary={summary} labels={labels} cols={cols} />
        </tbody>
      </table>

      <div style={styles.footerRow}>
        {['PARENTS/GUARDIANS', 'S.D.M', 'PRINCIPAL', 'DATE'].map((label) => (
          <div key={label} style={styles.footerCell}>
            <span style={{ fontWeight: 'bold', fontSize: '9.5px' }}>{label}</span>
          </div>
        ))}
      </div>

      {summary.nextTerm && (
        <div style={styles.nextTerm}>
          Next term re-opens: <strong>{summary.nextTerm}</strong>
        </div>
      )}
    </div>
  );
}
