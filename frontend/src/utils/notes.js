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

export function getAppreciation(valeur) {
  const v = parseFloat(valeur);
  if (Number.isNaN(v)) return { label: '—', className: '' };
  if (v >= 16) return { label: 'Très bien', className: 'excellent' };
  if (v >= 14) return { label: 'Bien', className: 'bien' };
  if (v >= 12) return { label: 'Assez bien', className: 'assez-bien' };
  if (v >= 10) return { label: 'Passable', className: 'passable' };
  return { label: 'Insuffisant', className: 'insuffisant' };
}

export function formatSessionCountdown(dateFinIso) {
  if (!dateFinIso) return null;
  const end = new Date(dateFinIso);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return 'Session expirée';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `Il reste ${days} jour${days > 1 ? 's' : ''} et ${hours}h`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `Il reste ${hours}h ${mins}min`;
}
