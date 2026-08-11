/** École primaire — référentiel et parcours SIL → CM2 / P1 → P6. */
export const PS_SUBSYSTEM_FR = 'FRANCOPHONE';
export const PS_SUBSYSTEM_EN = 'ANGLOPHONE';
export const PS_TYPE = 'GENERAL';
export const PS_CYCLE = 'PRIMAIRE';

export const PRIMAIRE_FR_LEVELS = [
  { code: 'PS', name: 'Petite Section' },
  { code: 'MS', name: 'Moyenne Section' },
  { code: 'GS', name: 'Grande Section' },
  { code: 'SIL', name: 'SIL' },
  { code: 'CP', name: 'CP' },
  { code: 'CE1', name: 'CE1' },
  { code: 'CE2', name: 'CE2' },
  { code: 'CM1', name: 'CM1' },
  { code: 'CM2', name: 'CM2' },
];

export const PRIMAIRE_EN_LEVELS = [
  { code: 'P1', name: 'Class 1' },
  { code: 'P2', name: 'Class 2' },
  { code: 'P3', name: 'Class 3' },
  { code: 'P4', name: 'Class 4' },
  { code: 'P5', name: 'Class 5' },
  { code: 'P6', name: 'Class 6' },
];

export const PRIMAIRE_SECTIONS = [
  { value: PS_SUBSYSTEM_FR, label: 'Francophone (Maternelle PS→GS, SIL→CM2)' },
  { value: PS_SUBSYSTEM_EN, label: 'Anglophone (Class 1 → 6)' },
];

const NEXT_FR = { PS: 'MS', MS: 'GS', GS: 'SIL', SIL: 'CP', CP: 'CE1', CE1: 'CE2', CE2: 'CM1', CM1: 'CM2', CM2: null };
const NEXT_EN = { P1: 'P2', P2: 'P3', P3: 'P4', P4: 'P5', P5: 'P6', P6: null };

export function nextPrimaryLevel(levelCode, subsystem = PS_SUBSYSTEM_FR) {
  const map = subsystem === PS_SUBSYSTEM_EN ? NEXT_EN : NEXT_FR;
  return map[levelCode] ?? null;
}

export function primaryLevelsForSection(section) {
  return section === PS_SUBSYSTEM_EN ? PRIMAIRE_EN_LEVELS : PRIMAIRE_FR_LEVELS;
}

export function primaryLevelOrder(levelCode) {
  const all = [...PRIMAIRE_FR_LEVELS, ...PRIMAIRE_EN_LEVELS];
  return all.findIndex((l) => l.code === levelCode);
}

export function suggestPrimaryClassName(levelCode, section, suffix = '') {
  const levels = primaryLevelsForSection(section);
  const label = levels.find((l) => l.code === levelCode)?.name || levelCode;
  const parts = [label];
  if (suffix.trim()) parts.push(suffix.trim());
  return parts.join(' — ');
}

export function buildPrimaryEnrollmentCodes(levelCode, subsystem = PS_SUBSYSTEM_FR) {
  return {
    subsystem_code: subsystem,
    type_code: PS_TYPE,
    cycle_code: PS_CYCLE,
    level_code: levelCode,
    series_code: null,
  };
}

export function buildPrimaryClassPayload({
  nom_personnalise,
  level_code,
  subsystem_code,
  effectif_max,
  prof_principal_id,
}) {
  return {
    nom_personnalise,
    effectif_max,
    prof_principal_id: prof_principal_id ? Number(prof_principal_id) : null,
    is_special: false,
    subsystem_code,
    type_code: PS_TYPE,
    cycle_code: PS_CYCLE,
    level_code,
    series_code: null,
  };
}

export function isPrimarySchoolClass(classe) {
  return classe?.cycle_code === PS_CYCLE;
}

export function suggestPrimaryDestination(groups, sourceGroup) {
  if (!sourceGroup?.level_code) return '';
  const next = nextPrimaryLevel(sourceGroup.level_code, sourceGroup.subsystem_code);
  if (!next) return '';
  const match = groups.find(
    (g) =>
      g.level_code === next &&
      g.subsystem_code === sourceGroup.subsystem_code &&
      String(g.id) !== String(sourceGroup.id),
  );
  return match ? String(match.id) : '';
}
