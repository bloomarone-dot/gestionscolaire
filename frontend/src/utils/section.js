/** Résolution section Francophone / Anglophone (miroir backend). */

const ANGLO_HINTS = [/\bform\b/i, /\bform\s*\d/i, /\blower\s*six\b/i, /\bupper\s*six\b/i];
const FRANCO_HINTS = [
  /\b6[eè]me\b/i,
  /\b5[eè]me\b/i,
  /\b4[eè]me\b/i,
  /\b3[eè]me\b/i,
  /\b2nde\b/i,
  /\b1[eè]re?\b/i,
  /\bpremi[eè]re\b/i,
  /\bterminale?\b/i,
  /\btle\b/i,
  /\bseconde\b/i,
];

function normText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function inferSubsystemFromText(value) {
  if (!value) return null;
  const text = normText(value);
  if (text.includes('anglo')) return 'ANGLOPHONE';
  if (text.includes('franco')) return 'FRANCOPHONE';
  if (ANGLO_HINTS.some((re) => re.test(text))) return 'ANGLOPHONE';
  if (FRANCO_HINTS.some((re) => re.test(text))) return 'FRANCOPHONE';
  return null;
}

export function resolveSubsystemCode(classe) {
  if (!classe) return null;
  if (classe.subsystem_code === 'ANGLOPHONE' || classe.subsystem_code === 'FRANCOPHONE') {
    return classe.subsystem_code;
  }
  const fields = [
    classe.specialite_libre,
    classe.section,
    classe.niveau_libre,
    classe.nom_personnalise,
    classe.nom,
    classe.name,
    classe.subsystem,
  ];
  for (const field of fields) {
    const found = inferSubsystemFromText(field);
    if (found) return found;
  }
  return null;
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

export function sectionBadgeTone(code) {
  return code === 'ANGLOPHONE' ? 'cyan' : 'violet';
}
