/** Checklist du dossier élève (secrétariat camerounais). */

export const PIECE_DEFS = [
  { key: 'acte_naissance', label: 'Acte de naissance' },
  { key: 'photo', label: "Photo d'identité" },
  { key: 'bulletin_precedent', label: "Bulletin de l'année précédente" },
  { key: 'quitus_ancienne_ecole', label: "Quitus de l'ancienne école" },
];

export function defaultPieces() {
  return Object.fromEntries(PIECE_DEFS.map((p) => [p.key, 'manquant']));
}

export function parsePieces(raw) {
  const base = defaultPieces();
  let incoming = raw;
  if (typeof raw === 'string') {
    try { incoming = JSON.parse(raw); } catch { incoming = {}; }
  }
  if (!incoming || typeof incoming !== 'object') return base;
  PIECE_DEFS.forEach(({ key }) => {
    if (incoming[key] === 'recu' || incoming[key] === 'manquant') base[key] = incoming[key];
  });
  return base;
}

export function piecesComplete(raw) {
  return Object.values(parsePieces(raw)).every((status) => status === 'recu');
}

export function missingPieceLabels(raw) {
  const pieces = parsePieces(raw);
  return PIECE_DEFS.filter((p) => pieces[p.key] !== 'recu').map((p) => p.label);
}
