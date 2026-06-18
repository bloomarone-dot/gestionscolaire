/** Transforme le bulletin API (normalizeBulletinView) → format BulletinScolaire (modèle utilisateur). */

function empty(v) {
  if (v == null || v === '' || v === '—') return null;
  return v;
}

function mapSubjectRow(row) {
  return {
    name: row.matiere || '',
    seq3: empty(row.seq1),
    seq4: empty(row.seq2),
    avg: empty(row.moyenne),
    coef: empty(row.coef),
    total: empty(row.points),
    rank: empty(row.rang_matiere),
    appre: empty(row.appreciation),
    teacher: empty(row.professeur),
  };
}

function subjectsForGroup(groups, groupe) {
  const g = (groups || []).find((x) => Number(x.groupe) === groupe);
  return (g?.matieres || []).map(mapSubjectRow);
}

export function mapBulletinScolaire(bulletin) {
  if (!bulletin) return null;

  const schoolHdr = bulletin.school_header || {};
  const L = bulletin.labels || {};
  const lang = bulletin.lang === 'en' ? 'en' : 'fr';
  const groups = bulletin.groupes_matieres || [];

  const seqLabels = [bulletin.seq1_label, bulletin.seq2_label].filter(Boolean);
  const seqLabel1 = seqLabels[0] || (lang === 'en' ? '3rd SEQ.' : '3e SÉQ.');
  const seqLabel2 = seqLabels[1] || (lang === 'en' ? '4th SEQ.' : '4e SÉQ.');

  const nameEn = (schoolHdr.school_name || 'ROYAL PRIESTHOOD INTERNATIONAL INSTITUTE').toUpperCase();
  const nameFr = (schoolHdr.school_name_fr || schoolHdr.school_name || nameEn).toUpperCase();
  const motto = schoolHdr.motto || 'a chosen generation';
  const pobox = schoolHdr.po_box || '';
  const phone = schoolHdr.phone || '672314497/676 035 708';

  const studentName = `${bulletin.eleve_nom || ''} ${bulletin.eleve_prenom || ''}`.trim().toUpperCase()
    || (bulletin.eleve || '').toUpperCase();

  return {
    school: {
      nameEn,
      taglineEn: motto,
      poboxEn: pobox ? `PO BOX ;- ${pobox}` : `PO BOX ;- ${phone}`,
      nameFr,
      taglineFr: motto,
      bpFr: pobox ? `BP ; ${pobox} ;- ${phone}` : `BP ; 20142 Yaounde ;- ${phone}`,
      ministryEn: 'MINISTRY OF SECONDARY EDUCATION',
      regionEn: schoolHdr.delegation_regional || 'REGIONAL DELEGATION FOR CENTER',
      divisionEn: schoolHdr.delegation_departementale || 'DIVISIONAL DELEGATION FOR MEFOU AND AFAMBA',
      ministryFr: L.ministry || "MINISTERE DE L'ENSEIGNEMENT SECONDAIRE",
      regionFr: schoolHdr.delegation_regional_fr || 'DELEGATION REGIONAL DU CENTRE',
      divisionFr: schoolHdr.delegation_departementale_fr || 'DELEGATION DEPARTEMENTALE DE LA MEOFU ET AFAMBA',
      logoUrl: schoolHdr.logo_url || null,
    },
    student: {
      name: studentName,
      class: (bulletin.classe || '').toUpperCase(),
      gender: empty(bulletin.eleve_sexe) || '',
      uniqueId: empty(bulletin.matricule) || '',
      term: (bulletin.term_label || '').toUpperCase(),
      year: bulletin.annee_scolaire || '',
      enrollment: empty(bulletin.effectif) || '',
      repeater: empty(bulletin.redoublant) || (lang === 'en' ? 'NO' : 'NON'),
    },
    subjects: {
      firstGroup: subjectsForGroup(groups, 1),
      secondGroup: subjectsForGroup(groups, 2),
      thirdGroup: subjectsForGroup(groups, 3),
    },
    groupLabels: {
      first: groups.find((g) => g.groupe === 1)?.label || (lang === 'en' ? 'FIRST GROUP' : 'PREMIER GROUPE'),
      second: groups.find((g) => g.groupe === 2)?.label || (lang === 'en' ? 'SECOND GROUP' : 'DEUXIÈME GROUPE'),
      third: groups.find((g) => g.groupe === 3)?.label || (lang === 'en' ? 'THIRD GROUP' : 'TROISIÈME GROUPE'),
    },
    seqLabel1,
    seqLabel2,
    lang,
    labels: {
      total: L.total || 'TOTAL',
      classAverage: L.class_average || (lang === 'en' ? 'CLASS AVERAGE' : 'Moyenne de la classe'),
      sanctions: L.sanctions || 'SANCTIONS',
      termAverage: L.term_average || (lang === 'en' ? 'TERM AVERAGE' : 'Moyenne'),
      absences: L.absences || (lang === 'en' ? 'Absences (hours)' : 'Absences'),
      position: L.position || (lang === 'en' ? 'POSITION' : 'Rang'),
      outOf: L.out_of || (lang === 'en' ? 'OUT OF' : 'Effectif'),
      remark: L.remark || (lang === 'en' ? 'REMARK' : 'Décision'),
      observation: L.observation || 'OBSERVATION',
    },
    summary: {
      totalCoef: empty(bulletin.total_coef),
      totalMarks: empty(bulletin.total_points),
      classAverage: empty(bulletin.moyenne_classe),
      termAverage: empty(bulletin.moyenne_generale),
      appreciation: empty(bulletin.appreciation_generale || bulletin.mention),
      absences: bulletin.absences ?? null,
      position: empty(bulletin.rang_label || bulletin.rang),
      outOf: empty(bulletin.effectif),
      remark: empty(bulletin.decision),
      observation: empty(bulletin.observation) || '',
      nextTerm: schoolHdr.next_term || '',
    },
  };
}
