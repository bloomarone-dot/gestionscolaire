/** Transforme le bulletin API (normalizeBulletinView) → vue BulletinScolaire. */

function empty(v) {
  if (v == null || v === '' || v === '—') return '';
  return v;
}

function mapSubjectRow(row, nSeq, isAnnual) {
  const subject = {
    name: row.matiere || '',
    avg: empty(row.moyenne),
    coef: empty(row.coef),
    total: empty(row.points),
    rank: empty(row.rang_matiere),
    appre: empty(row.appreciation),
    teacher: empty(row.professeur),
    seqs: [],
  };
  if (isAnnual) {
    for (let i = 0; i < nSeq; i += 1) {
      subject.seqs.push(empty(row[`seq${i + 1}`]));
    }
  } else {
    subject.seqs = [empty(row.seq1), empty(row.seq2)];
  }
  return subject;
}

function mapComplementaryRow(row, nSeq, isAnnual) {
  const subject = mapSubjectRow(row, nSeq, isAnnual);
  subject.rank = '';
  subject.teacher = '';
  return subject;
}

export function mapBulletinScolaire(bulletin) {
  if (!bulletin) return null;

  const L = bulletin.labels || {};
  const lang = bulletin.lang === 'en' ? 'en' : 'fr';
  const isAnnual = bulletin.bulletin_scope === 'annual';
  const school = bulletin.school_header || {};
  const nameEn = (school.school_name || 'ROYAL PRIESTHOOD INTERNATIONAL').toUpperCase();
  const nameFr = (school.school_name_fr || school.school_name || nameEn).toUpperCase();
  const motto = school.motto || 'A Chosen Generation : Believe-Achieve-Succeed';
  const pobox = school.po_box || '';

  const seqLabels = isAnnual
    ? (bulletin.sequence_labels || ['Moy. T1', 'Moy. T2', 'Moy. T3'])
    : [bulletin.seq1_label, bulletin.seq2_label].filter(Boolean);
  const nSeq = seqLabels.length || (isAnnual ? 3 : 2);

  const groups = (bulletin.groupes_matieres || []).map((g) => ({
    label: g.label || L[`group_${g.groupe}`] || `Groupe ${g.groupe}`,
    subjects: (g.matieres || []).map((m) => mapSubjectRow(m, nSeq, isAnnual)),
  }));

  const complementary = (bulletin.matieres_complementaires || []).map((m) =>
    mapComplementaryRow(m, nSeq, isAnnual),
  );

  const termAvgLabel = isAnnual
    ? (L.annual_average || (lang === 'en' ? 'ANNUAL AVERAGE' : 'MOYENNE ANNUELLE'))
    : (L.term_average || (lang === 'en' ? 'TERM AVERAGE' : 'MOYENNE DU TRIMESTRE'));

  const studentName = `${bulletin.eleve_nom || ''} ${bulletin.eleve_prenom || ''}`.trim().toUpperCase()
    || (bulletin.eleve || '').toUpperCase();

  return {
    lang,
    colCount: 1 + nSeq + 6,
    nSeq,
    seqLabels,
    reportTitle: bulletin.report_title || (lang === 'en' ? "STUDENT'S PROGRESS REPORT CARD" : 'BULLETIN'),
    L,
    school: {
      nameEn,
      nameFr,
      taglineEn: motto,
      taglineFr: motto,
      poboxEn: pobox ? `PO BOX: ${pobox}` : 'PO BOX:',
      bpFr: pobox ? `BP: ${pobox}` : 'BP:',
      ministryEn: 'MINISTRY OF SECONDARY EDUCATION',
      regionEn: school.delegation_regional || 'REGIONAL DELEGATION FOR CENTER',
      divisionEn: school.delegation_departementale || 'DIVISIONAL DELEGATION FOR MEFOU AND AFAMBA',
      ministryFr: L.ministry || "MINISTERE DE L'ENSEIGNEMENT SECONDAIRE",
      regionFr: school.delegation_regional_fr || 'DELEGATION REGIONALE DU CENTRE',
      divisionFr: school.delegation_departementale_fr || 'DELEGATION DEPARTEMENTALE DE LA MEFOU ET AFAMBA',
      logoUrl: school.logo_url || null,
      profPrincipal: school.prof_principal || '',
      nextTermNote: school.next_term || '',
    },
    student: {
      name: studentName,
      class: bulletin.classe || '',
      gender: empty(bulletin.eleve_sexe),
      uniqueId: empty(bulletin.matricule),
      term: bulletin.term_label || '',
      year: bulletin.annee_scolaire || '',
      enrollment: empty(bulletin.effectif),
      repeater: empty(bulletin.redoublant) || (lang === 'en' ? 'NO' : 'NON'),
      series: empty(bulletin.classe_serie),
    },
    groups,
    complementary,
    complementaryTitle: bulletin.complementary_label || L.complementary || '',
    summary: {
      totalCoef: empty(bulletin.total_coef),
      totalMarks: empty(bulletin.total_points),
      classAverage: empty(bulletin.moyenne_classe),
      termAverage: empty(bulletin.moyenne_generale),
      appreciation: empty(bulletin.appreciation_generale || bulletin.mention),
      absences: bulletin.absences ?? '',
      position: empty(bulletin.rang_label || bulletin.rang),
      outOf: empty(bulletin.effectif),
      remark: empty(bulletin.decision),
      observation: empty(bulletin.observation),
      sanctions: empty(bulletin.sanctions) || '0',
      termAvgLabel,
    },
    columns: {
      subjects: L.subjects || (lang === 'en' ? 'SUBJECTS' : 'MATIÈRES'),
      average: L.average || (lang === 'en' ? 'Average' : 'Moyenne'),
      coef: L.coefficient || 'Coef',
      totalMarks: L.total_marks || (lang === 'en' ? 'Total marks' : 'Notes'),
      rank: L.rank || (lang === 'en' ? 'Rank' : 'Rang'),
      appreciation: L.appreciation || 'Appr.',
      teacher: L.teacher_sign || (lang === 'en' ? "Teacher's sign.(MR/MRS/MISS)" : 'Professeur M./Mme'),
    },
    signatures: lang === 'en'
      ? [L.parents || 'PARENTS/GUARDIANS', L.sdm || 'S.D.M', L.principal || 'PRINCIPAL', L.date || 'DATE']
      : [L.parents || 'PARENTS/TUTEURS', L.principal_col || 'PROF PRINCIPAL', L.principal || 'PRINCIPAL', L.date || 'DATE'],
    nextTermPrefix: L.next_term || (lang === 'en' ? 'Next term re-opens' : 'Prochaine rentrée'),
  };
}
