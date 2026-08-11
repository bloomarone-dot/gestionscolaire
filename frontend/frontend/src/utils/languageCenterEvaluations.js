/** Évaluations centre de langues — séances du samedi par session annuelle. */

export const LC_MAX_SEANCES = 16;

export const LC_SESSION_OPTIONS = [
  { value: 1, label: 'Session 1' },
  { value: 2, label: 'Session 2' },
  { value: 3, label: 'Session 3' },
];

/** Code stocké en base (max 20 car.) : lc_s1_w01 … lc_s3_w16 */
export function lcSeanceTypeCode(session, seanceNum) {
  const s = Number(session);
  const w = Number(seanceNum);
  return `lc_s${s}_w${String(w).padStart(2, '0')}`;
}

export function lcSeanceLabel(seanceNum) {
  return `Samedi n° ${seanceNum}`;
}

export function lcSeanceOptions(session, max = LC_MAX_SEANCES) {
  const s = Number(session) || 1;
  return Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    return {
      value: lcSeanceTypeCode(s, n),
      label: lcSeanceLabel(n),
      seanceNum: n,
    };
  });
}

export function parseLcSeanceNum(typeEvaluation, session) {
  const prefix = `lc_s${Number(session)}_w`;
  if (!typeEvaluation?.startsWith(prefix)) return null;
  const n = parseInt(typeEvaluation.slice(prefix.length), 10);
  return Number.isFinite(n) ? n : null;
}

export function defaultLcSeanceForToday(session) {
  // Par défaut : prochain numéro de séance (1 si début de session).
  return lcSeanceTypeCode(session, 1);
}
