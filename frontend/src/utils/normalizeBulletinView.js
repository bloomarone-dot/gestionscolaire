/** Transforme la réponse API bulletins-service → format BulletinDetail (modèle RPH). */

function ordinal(n, lang) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (!num) return '—';
  if (lang === 'en') {
    if (num >= 11 && num <= 13) return `${num}th`;
    const suf = { 1: 'st', 2: 'nd', 3: 'rd' };
    return `${num}${suf[num % 10] || 'th'}`;
  }
  return num === 1 ? '1er' : `${num}e`;
}

function fmt(v) {
  if (v == null || v === '') return '—';
  return v;
}

export function normalizeBulletinView(data) {
  if (!data) return null;
  if (data.format === 'cameroon' && data.groupes_matieres) return data;

  const header = data.header || {};
  const b = data.bulletin || data;
  const lang = data.lang
    || (header.subsystem_code === 'ANGLOPHONE' ? 'en' : 'fr');
  const scope = header.scope || 'trimestre';
  const isAnnual = scope === 'annual';
  const trimestre = header.trimestre || 1;
  const L = header.labels || {};
  const seqLabels = header.seq_labels || [];

  const groups = {};
  const allSubjects = [
    ...(b.subjects || []),
    ...(b.special_subjects || []).map((s) => ({ ...s, groupe: s.groupe || 1 })),
  ];
  for (const s of allSubjects) {
    const g = s.groupe || 1;
    if (!groups[g]) groups[g] = [];
    const row = {
      matiere_id: s.matiere_id,
      matiere: s.nom,
      coef: s.coefficient,
      moyenne: fmt(s.moyenne),
      points: fmt(s.points),
      rang_matiere: ordinal(s.rang_matiere, lang),
      appreciation: s.appreciation || '—',
      professeur: (s.enseignant_nom || '—').toUpperCase(),
    };
    if (isAnnual) {
      (s.seqs || []).forEach((v, i) => {
        row[`seq${i + 1}`] = fmt(v);
      });
    } else {
      row.seq1 = fmt(s.seqs?.[0]);
      row.seq2 = fmt(s.seqs?.[1]);
    }
    groups[g].push(row);
  }

  const groupes_matieres = Object.keys(groups)
    .sort((a, b) => Number(a) - Number(b))
    .map((g) => ({
      groupe: Number(g),
      label: L[`group_${g}`] || `Groupe ${g}`,
      matieres: groups[g],
    }));

  const reportTitle = header.report_title
    || (lang === 'en' ? "STUDENT'S PROGRESS REPORT CARD" : 'BULLETIN');

  return {
    eleve_id: b.eleve_id,
    format: 'cameroon',
    lang,
    bulletin_scope: scope,
    section: lang === 'en' ? 'anglophone' : 'francophone',
    report_title: reportTitle,
    eleve: `${b.nom || ''} ${b.prenom || ''}`.trim(),
    eleve_nom: b.nom,
    eleve_prenom: b.prenom,
    eleve_sexe: (b.sexe || '—').toUpperCase(),
    matricule: b.matricule,
    redoublant: b.redoublant || (lang === 'fr' ? 'NON' : 'NO'),
    classe: header.classe,
    classe_serie: header.series_code || '—',
    annee_scolaire: header.school_year,
    trimestre,
    term_label: header.term,
    seq1_label: seqLabels[0],
    seq2_label: seqLabels[1],
    sequence_labels: seqLabels,
    effectif: header.effectif ?? data.effectif,
    moyenne_generale: b.moyenne_generale,
    moyenne_classe: data.moyenne_classe,
    appreciation_generale: b.appreciation_generale,
    mention: b.appreciation_generale,
    total_coef: b.total_coefficient,
    total_points: b.total_points,
    rang: b.rang_general,
    rang_general: b.rang_general,
    rang_label: ordinal(b.rang_general, lang),
    decision: b.decision,
    groupes_matieres,
    absences: 0,
    observation: '',
    sanctions: '',
    school_header: {
      school_name: header.school_name,
      school_name_fr: header.school_name_fr || header.school_name,
      logo_url: header.logo_url,
      motto: header.motto,
      po_box: header.po_box,
      delegation_regional: header.delegation_regional,
      delegation_departementale: header.delegation_departementale,
      delegation_regional_fr: header.delegation_regional_fr,
      delegation_departementale_fr: header.delegation_departementale_fr,
      prof_principal: header.prof_principal,
      next_term: header.next_term,
      bulletin_theme: header.bulletin_theme,
    },
    bulletin_theme: header.bulletin_theme,
  };
}
