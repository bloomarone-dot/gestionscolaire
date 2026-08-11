export const MAX_SEQUENCES = 6;

export function trimestreFromSequenceType(type) {
  if (!type?.startsWith('sequence_')) return null;
  const num = parseInt(type.replace('sequence_', ''), 10);
  if (Number.isNaN(num) || num < 1 || num > MAX_SEQUENCES) return null;
  return Math.ceil(num / 2);
}

export function globalSequenceNumber(trimestre, slot) {
  return (trimestre - 1) * 2 + slot;
}

export function sequenceColumnLabel(seqNum, section = 'francophone') {
  const lang = section === 'anglophone' ? 'en' : 'fr';
  if (lang === 'en') {
    const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[seqNum] || 'th';
    return `${seqNum}${suffix} sequence`;
  }
  return `${seqNum}${seqNum === 1 ? 'ère' : 'ème'} séquence`;
}

export function getAllSequenceEvalTypes(section = 'francophone') {
  return Array.from({ length: MAX_SEQUENCES }, (_, i) => {
    const num = i + 1;
    return {
      value: `sequence_${num}`,
      label: sequenceColumnLabel(num, section),
      trimestre: trimestreFromSequenceType(`sequence_${num}`),
    };
  });
}
