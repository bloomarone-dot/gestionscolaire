import { describe, expect, it } from 'vitest';
import {
  fallbackCycles,
  fallbackLevels,
  fallbackSeries,
  fallbackSubsystems,
  fallbackTeachingTypes,
} from './referentielFallback';

describe('referentielFallback', () => {
  it('propose francophone et anglophone', () => {
    expect(fallbackSubsystems().map((s) => s.code)).toEqual(['FRANCOPHONE', 'ANGLOPHONE']);
  });

  it('CM2 = CEP et Class 6 = FSLC', () => {
    const fr = fallbackLevels('FRANCOPHONE', 'GENERAL', 'PRIMAIRE');
    const en = fallbackLevels('ANGLOPHONE', 'GENERAL', 'PRIMAIRE');
    expect(fr.find((l) => l.code === 'CM2')?.exam).toBe('CEP');
    expect(en.find((l) => l.code === 'P6')?.exam).toBe('FSLC');
  });

  it('collège francophone : 6ème → Terminale + séries', () => {
    expect(fallbackCycles('FRANCOPHONE', 'GENERAL').map((c) => c.code)).toContain('PREMIER');
    expect(fallbackLevels('FRANCOPHONE', 'GENERAL', 'PREMIER').map((l) => l.code)).toEqual(['6E', '5E', '4E', '3E']);
    expect(fallbackSeries('TLE').map((s) => s.code)).toEqual(['A1', 'A2', 'A4', 'C', 'D']);
  });

  it('types selon le sous-système', () => {
    expect(fallbackTeachingTypes('FRANCOPHONE').map((t) => t.code)).toContain('LANGUE');
    expect(fallbackTeachingTypes('ANGLOPHONE').map((t) => t.code)).not.toContain('LANGUE');
  });
});
