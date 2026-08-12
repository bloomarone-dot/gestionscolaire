/** Ordre des niveaux MINESEC / primaire / CECRL. 4ème → 3ème = classe supérieure. */

export const NEXT_LEVEL = {
  '6E': '5E', '5E': '4E', '4E': '3E', '3E': '2ND', '2ND': '1ERE', '1ERE': 'TLE', TLE: null,
  '1CETIC': '2CETIC', '2CETIC': '3CETIC', '3CETIC': null,
  '2ND-T': '1ERE-T', '1ERE-T': 'TLE-T', 'TLE-T': null,
  F1: 'F2', F2: 'F3', F3: 'F4', F4: 'F5', F5: 'LS', LS: 'US', US: null,
  TF1: 'TF2', TF2: 'TF3', TF3: 'TF4', TF4: 'TF5', TF5: 'LST', LST: 'UST', UST: null,
  PS: 'MS', MS: 'GS', GS: 'SIL', SIL: 'CP', CP: 'CE1', CE1: 'CE2', CE2: 'CM1', CM1: 'CM2', CM2: null,
  P1: 'P2', P2: 'P3', P3: 'P4', P4: 'P5', P5: 'P6', P6: null,
  A1: 'A2', A2: 'B1', B1: 'B2', B2: 'C1', C1: 'C2', C2: null,
};

export const LEVEL_ORDER = [
  'PS', 'MS', 'GS',
  'SIL', 'CP', 'CE1', 'CE2', 'CM1', 'CM2',
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6',
  '6E', '5E', '4E', '3E', '2ND', '1ERE', 'TLE',
  'F1', 'F2', 'F3', 'F4', 'F5', 'LS', 'US',
  '1CETIC', '2CETIC', '3CETIC',
  '2ND-T', '1ERE-T', 'TLE-T',
  'TF1', 'TF2', 'TF3', 'TF4', 'TF5', 'LST', 'UST',
  'A1', 'A2', 'B1', 'B2', 'C1', 'C2',
];

const INDEX = Object.fromEntries(LEVEL_ORDER.map((code, i) => [code, i]));

export function classifyLevelMove(previousLevel, newLevel, previousClasseId, newClasseId) {
  const prev = INDEX[String(previousLevel || '').toUpperCase()];
  const next = INDEX[String(newLevel || '').toUpperCase()];
  if (prev == null || next == null) {
    if (previousClasseId && newClasseId && String(previousClasseId) !== String(newClasseId)) {
      return 'TRANSFER';
    }
    return 'TRANSFER';
  }
  if (next > prev) return 'PROMOTION';
  if (next < prev) return 'DOWNGRADE';
  if (previousClasseId && newClasseId && String(previousClasseId) !== String(newClasseId)) {
    return 'TRANSFER';
  }
  return 'REDOUBLE';
}

export function enrollmentActionLabel(action, previousLevel, newLevel) {
  if (action === 'PROMOTION') {
    return `Passage en classe supérieure détecté${previousLevel && newLevel ? ` (${previousLevel} → ${newLevel})` : ''}. L'élève existant sera réinscrit, pas recréé.`;
  }
  if (action === 'REDOUBLE') {
    return `Élève déjà connu à ce niveau${previousLevel ? ` (${previousLevel})` : ''}. Réinscription (redoublement) dans la classe choisie.`;
  }
  if (action === 'DOWNGRADE') {
    return `Attention : le niveau visé (${newLevel || '—'}) est inférieur à l'ancien (${previousLevel || '—'}). Vérifiez avant de valider.`;
  }
  if (action === 'TRANSFER') {
    return 'Élève déjà inscrit : changement de classe (même parcours).';
  }
  return '';
}
