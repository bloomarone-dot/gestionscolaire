/** Transforme la réponse API bulletins-service → format BulletinDetail (modèle RPH). */

import { BULLETIN_THEME_PRESETS } from './bulletinTheme';

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

function mapSubjectRow(s, lang, nSeq, isAnnual) {
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
  const seqs = s.seqs || [];
  if (isAnnual) {
    for (let i = 0; i < nSeq; i += 1) {
      row[`seq${i + 1}`] = fmt(seqs[i]);
    }
  } else {
    row.seq1 = fmt(seqs[0]);
    row.seq2 = fmt(seqs[1]);
  }
  return row;
}

function buildGroups(subjects, lang, nSeq, isAnnual, labels) {
  const groups = {};
  for (const s of subjects || []) {
    const g = s.groupe || 1;
    if (!groups[g]) groups[g] = [];
    groups[g].push(mapSubjectRow(s, lang, nSeq, isAnnual));
  }
  return Object.keys(groups)
    .sort((a, b) => Number(a) - Number(b))
    .map((g) => ({
      groupe: Number(g),
      label: labels[`group_${g}`] || `Groupe ${g}`,
      matieres: groups[g],
    }));
}

export function normalizeBulletinView(data) {
  if (!data) return null;

  const header = data.header || {};
  const b = data.bulletin || data;
  const lang = data.lang
    || (header.subsystem_code === 'ANGLOPHONE' ? 'en' : 'fr');
  const scope = header.scope || data.bulletin_scope || 'trimestre';
  const isAnnual = scope === 'annual';
  const trimestre = header.trimestre || data.trimestre || 1;
  const L = header.labels || {};
  const seqLabels = header.seq_labels || data.sequence_labels || [];
  const nSeq = isAnnual ? (seqLabels.length || 3) : 2;

  const groupes_matieres = buildGroups(b.subjects, lang, nSeq, isAnnual, L);
  const matieres_complementaires = (b.special_subjects || []).map((s) =>
    mapSubjectRow(s, lang, nSeq, isAnnual),
  );

  const reportTitle = header.report_title
    || data.report_title
    || (lang === 'en' ? "STUDENT'S PROGRESS REPORT CARD" : 'BULLETIN');

  const theme = header.bulletin_theme
    || data.bulletin_theme
    || BULLETIN_THEME_PRESETS.royal_priesthood;

  const effectif = header.effectif ?? data.effectif;

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
    classe: header.classe || data.classe,
    classe_serie: header.series_code || data.classe_serie || '—',
    annee_scolaire: header.school_year || data.annee_scolaire,
    trimestre,
    term_label: header.term || data.term_label,
    seq1_label: seqLabels[0] || data.seq1_label,
    seq2_label: seqLabels[1] || data.seq2_label,
    sequence_labels: seqLabels.length ? seqLabels : (isAnnual ? ['Moy. T1', 'Moy. T2', 'Moy. T3'] : undefined),
    effectif,
    moyenne_generale: b.moyenne_generale ?? data.moyenne_generale,
    moyenne_classe: data.moyenne_classe,
    appreciation_generale: b.appreciation_generale ?? data.appreciation_generale,
    mention: b.appreciation_generale ?? data.mention,
    total_coef: b.total_coefficient ?? data.total_coef,
    total_points: b.total_points ?? data.total_points,
    rang: b.rang_general ?? data.rang,
    rang_general: b.rang_general ?? data.rang_general,
    rang_label: ordinal(b.rang_general ?? data.rang_general, lang),
    decision: b.decision ?? data.decision,
    groupes_matieres: data.groupes_matieres?.length ? data.groupes_matieres : groupes_matieres,
    matieres_complementaires: data.matieres_complementaires?.length
      ? data.matieres_complementaires
      : matieres_complementaires,
    complementary_label: L.complementary
      || (lang === 'en' ? 'Complementary subjects (school)' : "Matières complémentaires de l'établissement"),
    absences: data.absences ?? 0,
    observation: data.observation ?? '',
    sanctions: data.sanctions ?? '',
    labels: L,
    school_header: {
      school_name: header.school_name || data.school_header?.school_name,
      school_name_fr: header.school_name_fr || header.school_name || data.school_header?.school_name_fr,
      logo_url: header.logo_url || data.school_header?.logo_url,
      motto: header.motto || data.school_header?.motto || 'a chosen generation',
      po_box: header.po_box || data.school_header?.po_box,
      delegation_regional: header.delegation_regional || data.school_header?.delegation_regional,
      delegation_departementale: header.delegation_departementale || data.school_header?.delegation_departementale,
      delegation_regional_fr: header.delegation_regional_fr || data.school_header?.delegation_regional_fr,
      delegation_departementale_fr: header.delegation_departementale_fr || data.school_header?.delegation_departementale_fr,
      prof_principal: header.prof_principal || data.school_header?.prof_principal,
      next_term: header.next_term || data.school_header?.next_term,
      bulletin_theme: theme,
    },
    bulletin_theme: theme,
  };
}
