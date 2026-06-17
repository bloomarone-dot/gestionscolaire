/** Résolution section Francophone / Anglophone (miroir backend). */

export function inferSubsystemFromText(value) {
  if (!value) return null;
  const text = String(value).toLowerCase();
  if (text.includes('anglo')) return 'ANGLOPHONE';
  if (text.includes('franco')) return 'FRANCOPHONE';
  return null;
}

export function resolveSubsystemCode(classe) {
  if (!classe) return null;
  if (classe.subsystem_code === 'ANGLOPHONE' || classe.subsystem_code === 'FRANCOPHONE') {
    return classe.subsystem_code;
  }
  return inferSubsystemFromText(classe.specialite_libre || classe.section || classe.subsystem);
}

export function subsystemLabelFromClasse(classe) {
  const code = resolveSubsystemCode(classe);
  if (code === 'ANGLOPHONE') return 'Anglophone';
  if (code === 'FRANCOPHONE') return 'Francophone';
  return null;
}

export function isAnglophone(classe) {
  return resolveSubsystemCode(classe) === 'ANGLOPHONE';
}

export function bulletinLangForClasse(classe) {
  return isAnglophone(classe) ? 'en' : 'fr';
}
