import { getAppreciationForSection, getEvalTypes } from './sections';
import { trimestreFromSequenceType } from './evaluationTypes';

export const TRIMESTRES = [1, 2, 3];

export const EVAL_TYPES = getEvalTypes('francophone');

export function evalTypeLabel(type, section = 'francophone') {
  const types = getEvalTypes(section);
  return types.find((t) => t.value === type)?.label
    || EVAL_TYPES.find((t) => t.value === type)?.label
    || type;
}

export function calcMoyenneTrimestre(seq1, seq2) {
  if (!seq1?.valeur && seq1?.valeur !== 0) return null;
  if (!seq2?.valeur && seq2?.valeur !== 0) return null;
  const c1 = seq1.coefficient ?? 1;
  const c2 = seq2.coefficient ?? 1;
  const total = c1 + c2;
  if (total <= 0) return null;
  return Math.round(((seq1.valeur * c1 + seq2.valeur * c2) / total) * 100) / 100;
}

export function getSeqNotesForEleve(eleveId, notes, trimestre) {
  const mine = notes.filter((n) => n.eleve_id === eleveId && n.trimestre === trimestre);
  const globalSeq1 = `sequence_${(trimestre - 1) * 2 + 1}`;
  const globalSeq2 = `sequence_${(trimestre - 1) * 2 + 2}`;
  return {
    seq1: mine.find((n) => n.type_evaluation === globalSeq1)
      || mine.find((n) => n.type_evaluation === 'sequence_1'),
    seq2: mine.find((n) => n.type_evaluation === globalSeq2)
      || mine.find((n) => n.type_evaluation === 'sequence_2'),
    trimestre: mine.find((n) => n.type_evaluation === 'trimestre'),
  };
}

export function getTrimestreForEvalType(type) {
  return trimestreFromSequenceType(type);
}

export function getAppreciation(valeur, section = 'francophone') {
  const result = getAppreciationForSection(valeur, section);
  return { label: result.label, className: result.className, code: result.code };
}

export { formatSessionCountdown } from './dates';
