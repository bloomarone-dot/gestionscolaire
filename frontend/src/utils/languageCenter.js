/** Référentiel fixe pour les centres de formation en langues (CECRL). */
export const LC_SUBSYSTEM = 'FRANCOPHONE';
export const LC_TYPE = 'LANGUE';
export const LC_CYCLE = 'CECRL';

export const LC_LANGUAGES = [
  { value: 'DE', label: 'Allemand' },
  { value: 'EN', label: 'Anglais' },
  { value: 'ES', label: 'Espagnol' },
  { value: 'FR', label: 'Français' },
  { value: 'IT', label: 'Italien' },
];

export const LC_LEVELS_FALLBACK = [
  { code: 'A1', name: 'A1 — Élémentaire' },
  { code: 'A2', name: 'A2 — Élémentaire avancé' },
  { code: 'B1', name: 'B1 — Intermédiaire' },
  { code: 'B2', name: 'B2 — Intermédiaire avancé' },
  { code: 'C1', name: 'C1 — Avancé' },
  { code: 'C2', name: 'C2 — Maîtrise' },
];

export function languageLabel(code) {
  return LC_LANGUAGES.find((l) => l.value === code)?.label || 'Allemand';
}

export function suggestGroupName(levelCode, langue, creneau) {
  if (!levelCode) return '';
  const parts = [levelCode, languageLabel(langue)];
  const slot = (creneau || '').trim();
  if (slot) parts.push(slot);
  return parts.join(' — ');
}

export function buildLanguageCenterClassPayload({
  nom_personnalise,
  level_code,
  effectif_max,
  prof_principal_id,
}) {
  return {
    nom_personnalise,
    effectif_max,
    prof_principal_id: prof_principal_id ? Number(prof_principal_id) : null,
    is_special: false,
    subsystem_code: LC_SUBSYSTEM,
    type_code: LC_TYPE,
    cycle_code: LC_CYCLE,
    level_code,
    series_code: null,
  };
}

export function buildLanguageCenterEnrollmentCodes(levelCode) {
  return {
    subsystem_code: LC_SUBSYSTEM,
    type_code: LC_TYPE,
    cycle_code: LC_CYCLE,
    level_code: levelCode,
    series_code: null,
  };
}

export function isLanguageCenterClass(classe) {
  return classe?.type_code === LC_TYPE || classe?.cycle_code === LC_CYCLE;
}

export function cecrlLevelLabel(levels, code) {
  const found = levels.find((l) => l.code === code);
  return found?.name || code || '—';
}

/** Ordre CECRL pour les passages de niveau. */
export const CECRL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function nextCecrlLevel(levelCode) {
  const i = CECRL_ORDER.indexOf(levelCode);
  if (i < 0 || i >= CECRL_ORDER.length - 1) return null;
  return CECRL_ORDER[i + 1];
}

export function cecrlLevelName(code) {
  const found = LC_LEVELS_FALLBACK.find((l) => l.code === code);
  return found?.name || code || '—';
}

/** Groupes de destination suggérés après validation (niveau CECRL suivant). */
export function suggestLcDestination(groups, sourceGroup) {
  if (!sourceGroup?.level_code) return '';
  const next = nextCecrlLevel(sourceGroup.level_code);
  if (!next) return '';
  const match = groups.find(
    (g) => g.level_code === next && String(g.id) !== String(sourceGroup.id),
  );
  return match ? String(match.id) : '';
}

export function lcGroupsAtLevel(groups, levelCode) {
  return groups.filter((g) => g.level_code === levelCode);
}

/** Décisions de passage centre de langues (mappées sur l'API §10). */
export const LC_PROMOTION_DECISIONS = [
  ['ADMIS', 'Validé — niveau supérieur'],
  ['REDOUBLE', 'À repasser — même niveau'],
  ['SORTANT', 'Abandon / fin de parcours'],
];
