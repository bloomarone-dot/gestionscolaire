/** Identité plateforme — visible partout dans l'UI. */
export const APP_NAME = 'BloomSchool';

export const APP_TAGLINE_PLATFORM = 'Plateforme de gestion scolaire';

/** Nom affiché pour un établissement (API tenant ou sélection superadmin). */
export function schoolDisplayName(school) {
  if (!school) return '';
  return school.name || school.nom || school.label || '';
}
