export const TRIMESTRES = [1, 2, 3];

export const EVAL_TYPES = [
  { value: 'sequence_1', label: '1ère séquence' },
  { value: 'sequence_2', label: '2ème séquence' },
  { value: 'trimestre', label: 'Note trimestrielle' },
];

export function evalTypeLabel(type) {
  return EVAL_TYPES.find((t) => t.value === type)?.label || type;
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
  return {
    seq1: mine.find((n) => n.type_evaluation === 'sequence_1'),
    seq2: mine.find((n) => n.type_evaluation === 'sequence_2'),
    trimestre: mine.find((n) => n.type_evaluation === 'trimestre'),
  };
}
