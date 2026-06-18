import React, { useMemo } from 'react';
import { mapBulletinScolaire } from '../utils/mapBulletinScolaire';

// ─── Couleurs du bulletin original ──────────────────────────────────────────
const C = {
  headerBg: '#4a6fa5',
  groupBg: '#4a6fa5',
  subjectBg: '#c8d8e8',
  labelBg: '#4a6fa5',
  borderDark: '#2c3e6b',
  white: '#ffffff',
  black: '#000000',
  lightGray: '#f0f4f8',
  footerBg: '#e8f0f8',
};

// ─── Styles inline ───────────────────────────────────────────────────────────
const styles = {
  page: {
    fontFamily: "'Arial', 'Helvetica', sans-serif",
    fontSize: '10px',
    color: C.black,
    backgroundColor: C.white,
    padding: '12px',
    maxWidth: '900px',
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
    width: '70px',
    height: '70px',
    border: `2px solid ${C.borderDark}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: '8px',
    color: '#666',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  logoImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    border: `1.5px solid ${C.borderDark}`,
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
    backgroundColor: C.labelBg,
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
  totalRow: {
    backgroundColor: C.headerBg,
    color: C.white,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: '3px',
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
    backgroundColor: C.white,
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

export default function BulletinScolaire({ bulletin }) {
  const data = useMemo(() => mapBulletinScolaire(bulletin), [bulletin]);
  if (!data) return null;

  const { school, student, subjects, summary, groupLabels, seqLabel1, seqLabel2 } = data;
  const allColspan = 9;

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
        <tbody>
          <tr>
            <td colSpan={allColspan} style={styles.titleCell}>
              STUDENT&apos;S PROGRESS REPORT CARD
            </td>
          </tr>

          <tr>
            <td style={{ ...styles.nameRow, width: '8%' }}>NAME:</td>
            <td colSpan={5} style={styles.nameValue}>{student.name}</td>
            <td style={{ ...styles.nameRow, width: '14%', textAlign: 'center' }}>CLASS:</td>
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
            <td colSpan={2} style={styles.infoValueCell}>{student.uniqueId}</td>
            <td colSpan={6} style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ ...styles.colHeader, width: '11%' }}>{seqLabel1}</td>
                    <td style={{ ...styles.colHeader, width: '11%' }}>{seqLabel2}</td>
                    <td style={{ ...styles.colHeader, width: '11%' }}>Average</td>
                    <td style={{ ...styles.colHeader, width: '8%' }}>Coef</td>
                    <td style={{ ...styles.colHeader, width: '13%' }}>Total marks</td>
                    <td style={{ ...styles.colHeader, width: '8%' }}>Rank</td>
                    <td style={{ ...styles.colHeader, width: '9%' }}>Appre.</td>
                    <td style={{ ...styles.colHeader }}>Teacher&apos;s sign.(MR/MRS/MISS)</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...styles.table, marginTop: '-1px' }}>
        <colgroup>
          <col style={{ width: '22%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '30%' }} />
        </colgroup>
        <tbody>
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

          <tr>
            <td colSpan={3} style={styles.totalRow}>TOTAL</td>
            <td style={styles.totalRow} />
            <td style={styles.totalRow}>{summary.totalCoef}</td>
            <td style={styles.totalRow}>{summary.totalMarks ?? ''}</td>
            <td colSpan={2} style={styles.totalRow}>CLASS AVERAGE</td>
            <td style={styles.totalRow}>
              {summary.classAverage}
              <span style={{ float: 'right', fontWeight: 'normal', fontSize: '8px' }}>SANCTIONS</span>
            </td>
          </tr>

          <tr>
            <td colSpan={1} style={styles.summaryLabelCell}>TERM AVERAGE</td>
            <td colSpan={2} style={styles.summaryValueCell}>{summary.termAverage ?? ''}</td>
            <td colSpan={2} style={styles.summaryValueCell}>{summary.appreciation}</td>
            <td colSpan={2} style={styles.summaryLabelCell}>Absences (hours)</td>
            <td style={styles.summaryValueCell}>{summary.absences ?? '0'}</td>
            <td style={styles.summaryValueCell}>{summary.absences ?? '0'}</td>
          </tr>

          <tr>
            <td colSpan={1} style={styles.summaryLabelCell}>POSITION</td>
            <td colSpan={1} style={styles.summaryValueCell}>{summary.position ?? ''}</td>
            <td colSpan={1} style={styles.summaryLabelCell}>OUT OF</td>
            <td colSpan={1} style={styles.summaryValueCell}>{summary.outOf}</td>
            <td colSpan={1} style={styles.summaryLabelCell}>REMARK</td>
            <td colSpan={4} style={styles.summaryValueCell}>{summary.remark}</td>
          </tr>

          <tr>
            <td colSpan={1} style={styles.summaryLabelCell}>OBSERVATION</td>
            <td colSpan={allColspan - 1} style={{ ...styles.summaryValueCell, minHeight: '20px', textAlign: 'left' }}>
              {summary.observation}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={styles.footerRow}>
        {['PARENTS/GUARDIANS', 'S.D.M', 'PRINCIPAL', 'DATE'].map((label, i) => (
          <div key={i} style={styles.footerCell}>
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
