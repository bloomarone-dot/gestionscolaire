import { describe, expect, it } from 'vitest';
import { missingPieceLabels, parsePieces, piecesComplete } from './studentPieces';

describe('studentPieces', () => {
  it('marque le dossier incomplet par défaut', () => {
    expect(piecesComplete(null)).toBe(false);
    expect(missingPieceLabels(null).length).toBe(4);
  });

  it('détecte un dossier complet', () => {
    const pieces = parsePieces({
      acte_naissance: 'recu',
      photo: 'recu',
      bulletin_precedent: 'recu',
      quitus_ancienne_ecole: 'recu',
    });
    expect(piecesComplete(pieces)).toBe(true);
    expect(missingPieceLabels(pieces)).toEqual([]);
  });
});
