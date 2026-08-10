/**
 * Valeurs de démonstration pour le Canvas éditeur uniquement.
 * Jamais persistées — le PDF / Preview API utilisent le DataContext réel.
 */
export const CANVAS_DEMO_VALUES = {
  'school.name': 'Établissement scolaire',
  'school.name_fr': 'Établissement scolaire',
  'school.name_en': 'School establishment',
  'school.logo': '',
  'school.address': 'BP 000 — Ville',
  'school.city': 'Ville',
  'school.phone': '6XX XX XX XX',
  'school.po_box': 'BP 000',
  'school.motto': 'Discipline — Travail — Succès',
  'school.delegation_regional': 'DÉLÉGATION RÉGIONALE DE …',
  'school.delegation_departementale': 'DÉLÉGATION DÉPARTEMENTALE DE …',
  'student.first_name': 'Jean',
  'student.last_name': 'DUPONT',
  'student.full_name': 'Jean DUPONT',
  'student.matricule': '2026-0001',
  'student.gender': 'M',
  'student.age': '15',
  'student.status': 'Actif',
  'student.repeat_status': 'Non',
  'student.date_of_birth': '01/01/2011',
  'student.photo': '',
  'class.name': '3ème',
  'class.size': '42',
  'class.level_code': '3E',
  'class.cycle_code': '1er cycle',
  'class.series_code': 'A',
  'class.subsystem_code': 'FR',
  'academic_year.name': '2025/2026',
  'term.name': '1er Trimestre',
  'term.number': '1',
  'term.scope': 'trimestre',
  'term.label': '1er Trimestre',
  'period.name': '1er Trimestre',
  'period.number': '1',
  'period.label': '1er Trimestre',
  'summary.general_average': '12,45',
  'summary.class_average': '11,80',
  'summary.rank': '5',
  'summary.class_size': '42',
  'summary.total_points': '186,75',
  'summary.total_coefficients': '15',
  'summary.decision': 'Admis(e)',
  'summary.observation': 'Bon travail. Peut mieux faire.',
  'attendance.absences': '2',
  'attendance.sanctions': '—',
};

const STUDENT_FIELD_LABELS = {
  full_name: 'Nom',
  first_name: 'Prénom',
  last_name: 'Nom',
  matricule: 'Matricule',
  class: 'Classe',
  gender: 'Sexe',
  age: 'Âge',
  status: 'Statut',
  repeat_status: 'Redoublant',
  photo: 'Photo',
  date_of_birth: 'Né(e) le',
};

const SUMMARY_FIELD_LABELS = {
  general_average: 'Moyenne générale',
  class_average: 'Moyenne de classe',
  rank: 'Rang',
  class_size: 'Effectif',
  total_points: 'Total points',
  total_coefficients: 'Total coef.',
  decision: 'Décision',
  observation: 'Observation',
};

export function interpolateDemo(text, values = CANVAS_DEMO_VALUES) {
  if (text == null) return '';
  return String(text).replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, path) => {
    if (Object.prototype.hasOwnProperty.call(values, path)) {
      const v = values[path];
      return v == null || v === '' ? '—' : String(v);
    }
    return '—';
  });
}

export function studentFieldLabel(field) {
  return STUDENT_FIELD_LABELS[field] || field;
}

export function studentFieldDemoValue(field) {
  const map = {
    full_name: CANVAS_DEMO_VALUES['student.full_name'],
    first_name: CANVAS_DEMO_VALUES['student.first_name'],
    last_name: CANVAS_DEMO_VALUES['student.last_name'],
    matricule: CANVAS_DEMO_VALUES['student.matricule'],
    class: CANVAS_DEMO_VALUES['class.name'],
    gender: CANVAS_DEMO_VALUES['student.gender'],
    age: CANVAS_DEMO_VALUES['student.age'],
    status: CANVAS_DEMO_VALUES['student.status'],
    repeat_status: CANVAS_DEMO_VALUES['student.repeat_status'],
    photo: '',
    date_of_birth: CANVAS_DEMO_VALUES['student.date_of_birth'],
  };
  return map[field] ?? '—';
}

export function summaryFieldLabel(field) {
  return SUMMARY_FIELD_LABELS[field] || field;
}

export function summaryFieldDemoValue(field) {
  const map = {
    general_average: CANVAS_DEMO_VALUES['summary.general_average'],
    class_average: CANVAS_DEMO_VALUES['summary.class_average'],
    rank: CANVAS_DEMO_VALUES['summary.rank'],
    class_size: CANVAS_DEMO_VALUES['summary.class_size'],
    total_points: CANVAS_DEMO_VALUES['summary.total_points'],
    total_coefficients: CANVAS_DEMO_VALUES['summary.total_coefficients'],
    decision: CANVAS_DEMO_VALUES['summary.decision'],
    observation: CANVAS_DEMO_VALUES['summary.observation'],
  };
  return map[field] ?? '—';
}

/** Matières fictives pour aperçu canvas uniquement (jamais sauvegardées). */
export function demoGradesRows(definition) {
  const groups = definition?.data_binding?.groups || [];
  const samples = [
    ['Mathématiques', '14.00', '13.50', '13.75', '4', '55.00', '3', 'Bien', 'M. A'],
    ['Français', '12.00', '11.00', '11.50', '3', '34.50', '8', 'Assez bien', 'Mme B'],
    ['Anglais', '15.00', '14.00', '14.50', '2', '29.00', '2', 'Très bien', 'M. C'],
    ['Physique', '10.00', '11.00', '10.50', '3', '31.50', '12', 'Passable', 'Mme D'],
    ['SVT', '13.00', '12.00', '12.50', '2', '25.00', '6', 'Bien', 'M. E'],
    ['Histoire-Géo', '11.00', '12.00', '11.50', '2', '23.00', '9', 'Assez bien', 'Mme F'],
  ];
  if (!groups.length) {
    return [{ kind: 'row', cells: samples[0] }];
  }
  const out = [];
  let i = 0;
  groups.forEach((g) => {
    out.push({ kind: 'group', label: g.label || g.id });
    const n = 2;
    for (let k = 0; k < n; k += 1) {
      out.push({ kind: 'row', cells: samples[i % samples.length] });
      i += 1;
    }
  });
  return out;
}
