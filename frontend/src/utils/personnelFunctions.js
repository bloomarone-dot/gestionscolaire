/** Fonctions personnel — collège/lycée (inchangé). */
export const STAFF_FUNCTIONS = [
  'Censeur',
  "Directeur d'etudes",
  'Surveillant General',
  'Surveillant de discipline',
  'Principal',
];

/** Fonctions personnel — école primaire (tous métiers). */
export const PRIMARY_STAFF_FUNCTIONS = [
  'Instituteur',
  'Institutrice',
  'Directeur',
  'Directrice',
  'Agent de sécurité',
  "Agent d'entretien",
  'Personnel de santé',
  'Chauffeur',
  'Surveillant',
  'Secrétaire',
  'Enseignant',
];

export const PRIMARY_TEACHER_FUNCTIONS = new Set([
  'Enseignant',
  'Instituteur',
  'Institutrice',
]);

export function staffFunctionsForKind(isPrimarySchool) {
  return isPrimarySchool ? PRIMARY_STAFF_FUNCTIONS : ['Enseignant', ...STAFF_FUNCTIONS];
}

export function isTeacherFonction(fonction, isPrimarySchool) {
  if (!isPrimarySchool) return fonction === 'Enseignant';
  return PRIMARY_TEACHER_FUNCTIONS.has(fonction);
}
