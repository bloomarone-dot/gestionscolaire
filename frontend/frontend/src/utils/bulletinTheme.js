/** Thème visuel bulletin — défauts et utilitaires (miroir backend). */

export const BULLETIN_THEME_SECTIONS = {
  national_header: 'En-tête national (bilingue + logo)',
  title_bar: 'Bandeau titre (BULLETIN)',
  identity_label: 'Identité élève — labels',
  identity_row: 'Identité élève — ligne grise',
  grades_header: 'En-tête tableau des notes',
  group_row: 'Bandeaux de groupes',
  grade_row: 'Lignes matières / notes',
  summary: 'Synthèse (totaux, moyennes)',
  signatures: 'Zone signatures',
  border: 'Bordures',
  text: 'Texte',
};

export const DEFAULT_BULLETIN_THEME = {
  national_header: '#d9ead3',
  title_bar: '#6fa8dc',
  identity_label: '#cfe2f3',
  identity_row: '#eeeeee',
  grades_header: '#6fa8dc',
  group_row: '#9fc5e8',
  grade_row: '#ffffff',
  summary: '#fce5cd',
  signatures: '#d9ead3',
  border: '#000000',
  text: '#000000',
};

export const BULLETIN_THEME_PRESETS = {
  royal_priesthood: {
    preset: 'royal_priesthood',
    national_header: '#ffffff',
    title_bar: '#4a6fa5',
    identity_label: '#4a6fa5',
    identity_row: '#ffffff',
    grades_header: '#4a6fa5',
    group_row: '#4a6fa5',
    grade_row: '#c8d8e8',
    summary: '#4a6fa5',
    signatures: '#ffffff',
    border: '#2c3e6b',
    text: '#ffffff',
  },
  cameroon_classic: {
    preset: 'cameroon_classic',
    national_header: '#d4edda',
    title_bar: '#cce5ff',
    identity_label: '#cce5ff',
    identity_row: '#cce5ff',
    grades_header: '#cce5ff',
    group_row: '#4a7ab8',
    grade_row: '#ffffff',
    summary: '#ffe5cc',
    signatures: '#d4edda',
    border: '#222222',
    text: '#000000',
  },
  minimal: {
    preset: 'minimal',
    national_header: '#f5f5f5',
    title_bar: '#e0e0e0',
    identity_label: '#fafafa',
    identity_row: '#f0f0f0',
    grades_header: '#e8e8e8',
    group_row: '#dddddd',
    grade_row: '#ffffff',
    summary: '#f5f5f5',
    signatures: '#f0f0f0',
    border: '#333333',
    text: '#000000',
  },
};

const PRESET_LABELS = {
  royal_priesthood: 'Royal Priesthood (vert / bleu)',
  cameroon_classic: 'Cameroun classique',
  minimal: 'Minimal (gris)',
};

export function presetLabel(key) {
  return PRESET_LABELS[key] || key;
}

function normHex(value, fallback) {
  if (!value || typeof value !== 'string') return fallback;
  let v = value.trim();
  if (!v.startsWith('#')) v = `#${v}`;
  return /^#[0-9A-Fa-f]{6}$/.test(v) ? v.toLowerCase() : fallback;
}

export function normalizeBulletinTheme(data) {
  const base = { ...DEFAULT_BULLETIN_THEME };
  if (!data) return base;
  const preset = data.preset && BULLETIN_THEME_PRESETS[data.preset];
  if (preset) Object.assign(base, preset);
  Object.keys(BULLETIN_THEME_SECTIONS).forEach((key) => {
    if (data[key]) base[key] = normHex(data[key], base[key]);
  });
  return base;
}

/** Variables CSS pour BulletinDetail */
export function themeToCssVars(theme) {
  const t = normalizeBulletinTheme(theme);
  return {
    '--b-national': t.national_header,
    '--b-title': t.title_bar,
    '--b-id-label': t.identity_label,
    '--b-id-row': t.identity_row,
    '--b-grades-h': t.grades_header,
    '--b-group': t.group_row,
    '--b-grade': t.grade_row,
    '--b-summary': t.summary,
    '--b-sig': t.signatures,
    '--b-border': t.border,
    '--b-text': t.text,
  };
}

export function applyPreset(presetKey) {
  const p = BULLETIN_THEME_PRESETS[presetKey];
  return p ? normalizeBulletinTheme(p) : normalizeBulletinTheme({});
}
