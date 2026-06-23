export const ESTABLISHMENT_KINDS = [
  { value: 'SCHOOL', label: 'École / collège / lycée' },
  { value: 'LANGUAGE_CENTER', label: 'Centre de formation en langues' },
];

const SCHOOL_UI = {
  classes: 'Classes',
  class: 'Classe',
  classOf: "Classe d'origine",
  student: 'Élève',
  students: 'Élèves',
  studentsList: 'Liste des élèves',
  enrollment: 'Inscriptions',
  newStudent: 'Nouvel élève',
  promotions: 'Promotions / Passages',
  trimestre: 'Trimestre',
  sessionPeriod: 'Session de saisie',
  bulletin: 'Bulletins',
  bulletinAnnual: 'Bulletin annuel',
  bulletinPreview: 'Aperçu bulletin',
  schoolProfile: "Profil de l'établissement",
  teachers: 'Enseignants',
  subjects: 'Matières',
  grades: 'Saisie des notes',
  dashboardStudents: 'Élèves',
  dashboardClasses: 'Classes',
  dashboardDesc: "Vue d'ensemble de l'établissement.",
  recentEnrollment: 'Dernières inscriptions',
  effectifs: 'Effectifs par classe',
  appTagline: 'School SaaS',
  loginTagline: 'Connectez-vous à votre espace de gestion scolaire.',
};

const LANGUAGE_CENTER_UI = {
  classes: 'Groupes',
  class: 'Groupe',
  classOf: 'Groupe actuel',
  student: 'Apprenant',
  students: 'Apprenants',
  studentsList: 'Liste des apprenants',
  enrollment: 'Inscriptions',
  newStudent: 'Nouvel apprenant',
  promotions: 'Passages de niveau',
  trimestre: 'Session',
  sessionPeriod: 'Période de saisie',
  bulletin: 'Relevés de notes',
  bulletinAnnual: 'Certificat de fin de formation',
  bulletinPreview: 'Aperçu du relevé',
  schoolProfile: 'Profil du centre',
  teachers: 'Formateurs',
  subjects: 'Modules / Matières',
  grades: 'Saisie des évaluations',
  dashboardStudents: 'Apprenants',
  dashboardClasses: 'Groupes',
  dashboardDesc: 'Vue d\'ensemble du centre de formation.',
  recentEnrollment: 'Dernières inscriptions',
  effectifs: 'Effectifs par groupe',
  appTagline: 'Centre de langues',
  loginTagline: 'Connectez-vous à votre espace de gestion du centre.',
};

export function isLanguageCenter(kind) {
  return kind === 'LANGUAGE_CENTER';
}

export function establishmentKindLabel(kind) {
  const found = ESTABLISHMENT_KINDS.find((k) => k.value === kind);
  return found?.label || 'École';
}

export function getEstablishmentUiLabels(kind) {
  return isLanguageCenter(kind) ? LANGUAGE_CENTER_UI : SCHOOL_UI;
}

export function defaultProfileForKind(kind) {
  if (kind === 'LANGUAGE_CENTER') {
    return {
      subsystems: ['FRANCOPHONE'],
      teaching_types: ['LANGUE'],
      channels: ['INTERNAL'],
    };
  }
  return {
    subsystems: ['FRANCOPHONE', 'ANGLOPHONE'],
    teaching_types: ['GENERAL', 'TECHNIQUE'],
    channels: ['INTERNAL'],
  };
}

export function periodOptions(kind) {
  if (isLanguageCenter(kind)) {
    return [
      { value: '1', label: 'Session 1' },
      { value: '2', label: 'Session 2' },
      { value: '3', label: 'Session 3' },
      { value: 'annual', label: 'Certificat annuel' },
    ];
  }
  return [
    { value: '1', label: 'Trimestre 1' },
    { value: '2', label: 'Trimestre 2' },
    { value: '3', label: 'Trimestre 3' },
    { value: 'annual', label: 'Bulletin annuel' },
  ];
}

export function periodLabel(kind, period) {
  const opts = periodOptions(kind);
  return opts.find((o) => o.value === String(period))?.label
    || (period === 'annual' ? opts.find((o) => o.value === 'annual')?.label : `Période ${period}`);
}
