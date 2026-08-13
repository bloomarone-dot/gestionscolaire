import { describe, expect, it } from 'vitest';
import { conseilDecisionLabel, EXAM_CODES, sanctionLabel } from './vieScolaire';

describe('vieScolaire labels', () => {
  it('libellés sanctions et décisions', () => {
    expect(sanctionLabel('BLAME')).toBe('Blâme');
    expect(conseilDecisionLabel('ADMIS_CONDITIONNEL')).toBe('Admis conditionnel');
  });

  it('inclut CEP (CM2) et FSLC (Class 6)', () => {
    expect(EXAM_CODES).toContain('CEP');
    expect(EXAM_CODES).toContain('FSLC');
  });
});
