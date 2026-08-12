import { describe, expect, it } from 'vitest';
import { classifyLevelMove, enrollmentActionLabel } from './levelProgression';

describe('classifyLevelMove', () => {
  it('détecte 4ème → 3ème comme classe supérieure', () => {
    expect(classifyLevelMove('4E', '3E', 10, 20)).toBe('PROMOTION');
  });

  it('détecte un redoublement au même niveau', () => {
    expect(classifyLevelMove('3E', '3E', 10, 10)).toBe('REDOUBLE');
  });

  it('détecte un recul de niveau', () => {
    expect(classifyLevelMove('3E', '4E', 10, 20)).toBe('DOWNGRADE');
  });
});

describe('enrollmentActionLabel', () => {
  it('explique le passage', () => {
    expect(enrollmentActionLabel('PROMOTION', '4E', '3E')).toMatch(/classe supérieure/);
  });
});
