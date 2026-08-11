export const SECTION_OPTIONS = [
  { value: 'francophone', label: 'Francophone' },
  { value: 'anglophone', label: 'Anglophone' },
];

export const PROF_SECTION_OPTIONS = [
  ...SECTION_OPTIONS,
  { value: 'les_deux', label: 'Les deux sections' },
];

export function getSectionLang(section) {
  return section === 'anglophone' ? 'en' : 'fr';
}

export function getSectionLabel(section) {
  const found = PROF_SECTION_OPTIONS.find((s) => s.value === section);
  return found ? found.label : section || 'Francophone';
}

export function classMatchesProfSection(profSection, classSection) {
  const prof = profSection || 'francophone';
  const cls = classSection || 'francophone';
  if (prof === 'les_deux') return true;
  return prof === cls;
}

export function getEvalTypes(section) {
  const lang = getSectionLang(section);
  const sequences = Array.from({ length: 6 }, (_, i) => {
    const num = i + 1;
    if (lang === 'en') {
      const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[num] || 'th';
      return { value: `sequence_${num}`, label: `${num}${suffix} sequence`, trimestre: Math.ceil(num / 2) };
    }
    return { value: `sequence_${num}`, label: `${num}${num === 1 ? 'ère' : 'ème'} séquence`, trimestre: Math.ceil(num / 2) };
  });
  return [
    ...sequences,
    { value: 'trimestre', label: lang === 'en' ? 'Term grade' : 'Note trimestrielle' },
  ];
}

export function getTrimestreLabel(trimestre, section, establishmentKind = 'SCHOOL') {
  if (establishmentKind === 'LANGUAGE_CENTER') {
    return `Session ${trimestre}`;
  }
  const lang = getSectionLang(section);
  if (lang === 'en') {
    const suffix = trimestre === 1 ? 'st' : trimestre === 2 ? 'nd' : 'rd';
    return `${trimestre}${suffix} term`;
  }
  return `${trimestre}${trimestre === 1 ? 'er' : 'ème'} trimestre`;
}

/** Appréciations bulletin Cameroun : NA/ECA/A (FR) ou CNA/IPA/A (EN) */
export function getAppreciationForSection(valeur, section) {
  const v = parseFloat(valeur);
  if (Number.isNaN(v)) return { code: '—', label: '—', className: '' };

  const lang = getSectionLang(section);
  if (v >= 16) {
    return lang === 'en'
      ? { code: 'A', label: 'Excellent (A)', className: 'excellent' }
      : { code: 'A', label: 'Très bien (A)', className: 'excellent' };
  }
  if (v >= 14) {
    return lang === 'en'
      ? { code: 'A', label: 'Good (A)', className: 'bien' }
      : { code: 'A', label: 'Bien (A)', className: 'bien' };
  }
  if (v >= 12) {
    return lang === 'en'
      ? { code: 'A', label: 'Fairly good (A)', className: 'assez-bien' }
      : { code: 'A', label: 'Assez bien (A)', className: 'assez-bien' };
  }
  if (v >= 10) {
    return lang === 'en'
      ? { code: 'IPA', label: 'In progress (IPA)', className: 'passable' }
      : { code: 'ECA', label: 'En cours (ECA)', className: 'passable' };
  }
  return lang === 'en'
    ? { code: 'CNA', label: 'Not acquired (CNA)', className: 'insuffisant' }
    : { code: 'NA', label: 'Non acquis (NA)', className: 'insuffisant' };
}

export function getNotesUiLabels(section, establishmentKind = 'SCHOOL') {
  const lang = getSectionLang(section);
  const lc = establishmentKind === 'LANGUAGE_CENTER';
  if (lang === 'en') {
    return {
      trimestre: lc ? 'Session' : 'Term',
      sequencePeriod: lc ? 'Evaluation / Period' : 'Sequence / Period',
      entryTitle: lc ? 'Evaluation entry' : 'Grade entry',
      number: 'N°',
      matricule: 'Reg. No.',
      fullName: 'Full name',
      mark: 'Mark / 20',
      appreciation: 'Remark',
      comment: 'Comment',
      sessionBanner:
        'Remarks are generated automatically from the mark (CNA / IPA / A). You may add a personal comment per student.',
      sectionBadge: 'Anglophone section',
    };
  }
  return {
    trimestre: lc ? 'Session' : 'Trimestre',
    sequencePeriod: lc ? 'Évaluation / Période' : 'Séquence / Période',
    entryTitle: lc ? 'Saisie des évaluations' : 'Saisie des notes',
    number: 'N°',
    matricule: 'Matricule',
    fullName: 'Nom et Prénoms',
    mark: 'Note / 20',
    appreciation: 'Appréciation',
    comment: 'Commentaire',
    sessionBanner: lc
      ? 'Appréciations automatiques selon la note. Vous pouvez ajouter un commentaire par apprenant.'
      : 'Appréciations automatiques selon la note (NA / ECA / A). Vous pouvez ajouter un commentaire par élève.',
    sectionBadge: 'Section francophone',
  };
}
