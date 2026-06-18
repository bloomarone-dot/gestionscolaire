/** Proportions colonnes bulletin — miroir services/bulletins-service/app/pdf.py */

export function spanParts(nCols, parts) {
  const base = Math.floor(nCols / parts);
  const rem = nCols % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rem ? 1 : 0));
}

/** Largeurs % pour n séquences (sujet + n seq + moy/coef/notes/rang/appr + prof). */
export function bulletinColPcts(nSeq) {
  const wSubj = 4.0;
  const wSeq = 1.25;
  const tail = [1.45, 0.95, 1.45, 1.05, 1.55];
  const tailSum = tail.reduce((a, b) => a + b, 0);
  let wProf = Math.max(2.8, 19.0 - wSubj - wSeq * nSeq - tailSum);
  const total = wSubj + wSeq * nSeq + tailSum + wProf;
  const widths = [wSubj, ...Array(nSeq).fill(wSeq), ...tail, wProf];
  return widths.map((w) => (w / total) * 100);
}

/** Colonnes matières complémentaires (sans rang ni prof). */
export function complementaryColPcts(nSeq) {
  const base = bulletinColPcts(nSeq);
  const main = base.slice(0, nSeq + 5);
  const tail = base.slice(nSeq + 5).reduce((a, b) => a + b, 0);
  return [...main, tail];
}

export function bulletinColCount(nSeq) {
  return 1 + nSeq + 6;
}

/** Indices colonnes (sujet=0, séquences, moyenne, coef, notes, rang, appr, prof). */
export function bulletinSummaryCols(nSeq) {
  const avgCol = 1 + nSeq;
  const coefCol = avgCol + 1;
  const marksCol = coefCol + 1;
  const rankCol = marksCol + 1;
  const apprCol = rankCol + 1;
  const teacherCol = apprCol + 1;
  return {
    nCols: bulletinColCount(nSeq),
    avgCol,
    coefCol,
    marksCol,
    rankCol,
    apprCol,
    teacherCol,
  };
}
