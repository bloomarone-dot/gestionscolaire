/** Snapshot MINESEC hors-ligne — création de classe si le référentiel est injoignable. */

export const FALLBACK_SUBSYSTEMS = [
  { id: 1, code: 'FRANCOPHONE', name: 'Francophone' },
  { id: 2, code: 'ANGLOPHONE', name: 'Anglophone' },
];

const TYPE_GENERAL = { id: 1, code: 'GENERAL', name_fr: 'Général', name_en: 'General' };
const TYPE_TECHNIQUE = { id: 2, code: 'TECHNIQUE', name_fr: 'Technique', name_en: 'Technical' };
const TYPE_LANGUE = { id: 3, code: 'LANGUE', name_fr: 'Formation en langues', name_en: 'Language training' };

const CYCLE_PRIMAIRE = { id: 1, code: 'PRIMAIRE', name_fr: 'École primaire', name_en: 'Primary school', order: 0 };
const CYCLE_PREMIER = { id: 2, code: 'PREMIER', name_fr: 'Premier Cycle', name_en: 'First Cycle', order: 1 };
const CYCLE_SECOND = { id: 3, code: 'SECOND', name_fr: 'Second Cycle', name_en: 'Second Cycle', order: 2 };
const CYCLE_CECRL = { id: 4, code: 'CECRL', name_fr: 'Cadre européen commun (CECRL)', name_en: 'CEFR', order: 3 };

function L(code, name, exam, order) {
  return { id: order, code, name, exam, order };
}

function S(code, nameFr, nameEn) {
  return { id: code, code, name_fr: nameFr, name_en: nameEn };
}

const LEVELS = {
  'FRANCOPHONE|GENERAL|PRIMAIRE': [
    L('PS', 'Petite Section (Maternelle)', null, 1),
    L('MS', 'Moyenne Section (Maternelle)', null, 2),
    L('GS', 'Grande Section (Maternelle)', null, 3),
    L('SIL', "Section d'Initiation au Langage (SIL)", null, 4),
    L('CP', 'Cours Préparatoire (CP)', null, 5),
    L('CE1', 'Cours Élémentaire 1 (CE1)', null, 6),
    L('CE2', 'Cours Élémentaire 2 (CE2)', null, 7),
    L('CM1', 'Cours Moyen 1 (CM1)', null, 8),
    L('CM2', 'Cours Moyen 2 (CM2)', 'CEP', 9),
  ],
  'ANGLOPHONE|GENERAL|PRIMAIRE': [
    L('P1', 'Class 1', null, 1),
    L('P2', 'Class 2', null, 2),
    L('P3', 'Class 3', null, 3),
    L('P4', 'Class 4', null, 4),
    L('P5', 'Class 5', null, 5),
    L('P6', 'Class 6', 'FSLC', 6),
  ],
  'FRANCOPHONE|GENERAL|PREMIER': [
    L('6E', '6ème', null, 1),
    L('5E', '5ème', null, 2),
    L('4E', '4ème', null, 3),
    L('3E', '3ème', 'BEPC', 4),
  ],
  'FRANCOPHONE|GENERAL|SECOND': [
    L('2ND', '2nde', null, 5),
    L('1ERE', '1ère', 'Probatoire', 6),
    L('TLE', 'Terminale', 'BAC', 7),
  ],
  'FRANCOPHONE|TECHNIQUE|PREMIER': [
    L('1CETIC', '1ère année CETIC', null, 1),
    L('2CETIC', '2ème année CETIC', null, 2),
    L('3CETIC', '3ème année CETIC', 'CAP', 3),
  ],
  'FRANCOPHONE|TECHNIQUE|SECOND': [
    L('2ND-T', '2nde Technique', null, 4),
    L('1ERE-T', '1ère Technique', 'Probatoire Technique', 5),
    L('TLE-T', 'Terminale Technique', 'BAC Technique', 6),
  ],
  'ANGLOPHONE|GENERAL|PREMIER': [
    L('F1', 'Form 1', null, 1),
    L('F2', 'Form 2', null, 2),
    L('F3', 'Form 3', null, 3),
    L('F4', 'Form 4', null, 4),
    L('F5', 'Form 5', 'GCE O Level', 5),
  ],
  'ANGLOPHONE|GENERAL|SECOND': [
    L('LS', 'Lower Sixth', null, 6),
    L('US', 'Upper Sixth', 'GCE A Level', 7),
  ],
  'ANGLOPHONE|TECHNIQUE|PREMIER': [
    L('TF1', 'Form 1 (Technical)', null, 1),
    L('TF2', 'Form 2 (Technical)', null, 2),
    L('TF3', 'Form 3 (Technical)', null, 3),
    L('TF4', 'Form 4 (Technical)', null, 4),
    L('TF5', 'Form 5 (Technical)', 'GCE O Level', 5),
  ],
  'ANGLOPHONE|TECHNIQUE|SECOND': [
    L('LST', 'Lower Sixth Technical', null, 6),
    L('UST', 'Upper Sixth Technical', 'GCE A Level', 7),
  ],
  'FRANCOPHONE|LANGUE|CECRL': [
    L('A1', 'A1 — Découverte', null, 1),
    L('A2', 'A2 — Élémentaire', null, 2),
    L('B1', 'B1 — Intermédiaire', null, 3),
    L('B2', 'B2 — Intermédiaire avancé', null, 4),
    L('C1', 'C1 — Avancé', null, 5),
    L('C2', 'C2 — Maîtrise', null, 6),
  ],
};

const SERIES = {
  '2ND': [S('A4', 'A4 — Lettres Bilingue', 'A4 — Bilingual Letters'), S('C', 'C — Sciences', 'C — Sciences'), S('D', 'D — Sciences (Biologie)', 'D — Biology')],
  '1ERE': [
    S('A1', 'A1 — Lettres-Langues', 'A1 — Letters-Languages'),
    S('A2', 'A2 — Lettres-Langues 2e langue', 'A2 — Letters 2nd lang'),
    S('A4', 'A4 — Lettres Bilingue', 'A4 — Bilingual Letters'),
    S('C', 'C — Sciences', 'C — Sciences'),
    S('D', 'D — Sciences (Biologie)', 'D — Biology'),
  ],
  TLE: [
    S('A1', 'A1 — Lettres-Langues', 'A1 — Letters-Languages'),
    S('A2', 'A2 — Lettres-Langues 2e langue', 'A2 — Letters 2nd lang'),
    S('A4', 'A4 — Lettres Bilingue', 'A4 — Bilingual Letters'),
    S('C', 'C — Sciences', 'C — Sciences'),
    S('D', 'D — Sciences (Biologie)', 'D — Biology'),
  ],
  '1CETIC': [S('ELEC', 'Électricité', 'Electricity'), S('CBOIS', 'Construction Bois', 'Wood'), S('CMETAL', 'Construction Métallique', 'Metal'), S('MECAUTO', 'Mécanique Auto', 'Auto'), S('COUTURE', 'Couture-Mode', 'Fashion'), S('ESF', 'ESF', 'Home Economics')],
  '2CETIC': [S('ELEC', 'Électricité', 'Electricity'), S('CBOIS', 'Construction Bois', 'Wood'), S('CMETAL', 'Construction Métallique', 'Metal'), S('MECAUTO', 'Mécanique Auto', 'Auto'), S('COUTURE', 'Couture-Mode', 'Fashion'), S('ESF', 'ESF', 'Home Economics')],
  '3CETIC': [S('ELEC', 'Électricité', 'Electricity'), S('CBOIS', 'Construction Bois', 'Wood'), S('CMETAL', 'Construction Métallique', 'Metal'), S('MECAUTO', 'Mécanique Auto', 'Auto'), S('COUTURE', 'Couture-Mode', 'Fashion'), S('ESF', 'ESF', 'Home Economics')],
  '2ND-T': [S('TI', 'TI — Informatique', 'TI'), S('CG', 'CG — Comptabilité-Gestion', 'CG'), S('ACC', 'ACC', 'ACC'), S('SES', 'SES', 'SES'), S('ESF', 'ESF', 'Home Economics')],
  '1ERE-T': [S('F1', 'F1 — Génie Civil', 'F1'), S('F2', 'F2 — Génie Électrique', 'F2'), S('F3', 'F3 — Génie Mécanique', 'F3'), S('G1', 'G1 — Comptabilité', 'G1'), S('G2', 'G2 — Action Commerciale', 'G2'), S('G3', 'G3 — Secrétariat', 'G3'), S('ESF', 'ESF', 'Home Economics')],
  'TLE-T': [S('F1', 'F1 — Génie Civil', 'F1'), S('F2', 'F2 — Génie Électrique', 'F2'), S('F3', 'F3 — Génie Mécanique', 'F3'), S('G1', 'G1 — Comptabilité', 'G1'), S('G2', 'G2 — Action Commerciale', 'G2'), S('G3', 'G3 — Secrétariat', 'G3'), S('ESF', 'ESF', 'Home Economics')],
  LS: [S('ARTS', 'Arts', 'Arts'), S('SCIENCE', 'Science', 'Science'), S('COMMERCIAL', 'Commercial', 'Commercial')],
  US: [S('ARTS', 'Arts', 'Arts'), S('SCIENCE', 'Science', 'Science'), S('COMMERCIAL', 'Commercial', 'Commercial')],
};

export function fallbackSubsystems() {
  return FALLBACK_SUBSYSTEMS;
}

export function fallbackTeachingTypes(subsystem) {
  if (!subsystem) return [TYPE_GENERAL, TYPE_TECHNIQUE];
  if (subsystem === 'FRANCOPHONE') return [TYPE_GENERAL, TYPE_TECHNIQUE, TYPE_LANGUE];
  return [TYPE_GENERAL, TYPE_TECHNIQUE];
}

export function fallbackCycles(subsystem, type) {
  if (type === 'LANGUE') return [CYCLE_CECRL];
  if (type === 'GENERAL') return [CYCLE_PRIMAIRE, CYCLE_PREMIER, CYCLE_SECOND];
  if (type === 'TECHNIQUE') return [CYCLE_PREMIER, CYCLE_SECOND];
  return [CYCLE_PREMIER, CYCLE_SECOND];
}

export function fallbackLevels(subsystem, type, cycle) {
  return LEVELS[`${subsystem}|${type}|${cycle}`] || [];
}

export function fallbackSeries(levelCode) {
  return SERIES[levelCode] || [];
}
