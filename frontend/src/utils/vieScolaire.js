/** Libellés vie scolaire / conseil / examens (alignés backend). */

export const SANCTION_KINDS = [
  ['AVERTISSEMENT', 'Avertissement'],
  ['BLAME', 'Blâme'],
  ['EXCLUSION_TEMPORAIRE', 'Exclusion temporaire'],
  ['CONVOCATION', 'Convocation des parents'],
  ['OBSERVATION', 'Observation'],
];

export const CONSEIL_DECISIONS = [
  ['ADMIS', 'Admis'],
  ['ADMIS_CONDITIONNEL', 'Admis conditionnel'],
  ['REDOUBLE', 'Redouble'],
  ['EXCLU', 'Exclu'],
  ['SORTANT', 'Sortant'],
  ['A_DELIBERER', 'À délibérer'],
];

export const EXAM_CODES = [
  'BEPC',
  'Probatoire',
  'BAC',
  'GCE O Level',
  'GCE A Level',
];

export const EXAM_RESULTS = [
  ['INSCRIT', 'Inscrit'],
  ['ADMIS', 'Admis'],
  ['ECHOUE', 'Échoué'],
  ['ABSENT', 'Absent'],
];

export function sanctionLabel(kind) {
  return SANCTION_KINDS.find(([k]) => k === kind)?.[1] || kind;
}

export function conseilDecisionLabel(code) {
  return CONSEIL_DECISIONS.find(([k]) => k === code)?.[1] || code;
}
