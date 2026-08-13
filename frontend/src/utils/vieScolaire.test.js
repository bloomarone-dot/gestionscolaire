import { describe, expect, it } from 'vitest';
import { conseilDecisionLabel, sanctionLabel } from './vieScolaire';

describe('vieScolaire labels', () => {
  it('libellés sanctions et décisions', () => {
    expect(sanctionLabel('BLAME')).toBe('Blâme');
    expect(conseilDecisionLabel('ADMIS_CONDITIONNEL')).toBe('Admis conditionnel');
  });
});
