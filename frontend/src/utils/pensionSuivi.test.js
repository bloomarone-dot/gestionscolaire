import { describe, expect, it } from 'vitest';
import { buildPensionSuiviRow, feeBucketStatus, matchesSuiviFilter } from './pensionSuivi';

const eleve = { id: 1, nom: 'Eboa', prenom: 'Marie', matricule: 'EL-1', classe_id: 4 };
const schedule = { inscription: 20000, tranche1: 30000, tranche2: 30000, tranche3: 20000 };

describe('feeBucketStatus', () => {
  it('distingue payé, partiel et impayé', () => {
    expect(feeBucketStatus(20000, 20000)).toBe('paid');
    expect(feeBucketStatus(30000, 10000)).toBe('partial');
    expect(feeBucketStatus(30000, 0)).toBe('unpaid');
    expect(feeBucketStatus(0, 0)).toBe('none');
  });
});

describe('buildPensionSuiviRow', () => {
  it('détecte une inscription seulement', () => {
    const row = buildPensionSuiviRow(eleve, schedule, {
      inscription_paid: 20000, tranche1_paid: 0, tranche2_paid: 0, tranche3_paid: 0, total_paid: 20000,
    }, { 4: '3ème A' });
    expect(row.progress).toBe('inscription');
    expect(row.buckets[0].status).toBe('paid');
    expect(row.buckets[1].status).toBe('unpaid');
    expect(row.detail).toMatch(/Inscription payée/i);
  });

  it('détecte une 1re tranche partielle', () => {
    const row = buildPensionSuiviRow(eleve, schedule, {
      inscription_paid: 20000, tranche1_paid: 10000, tranche2_paid: 0, tranche3_paid: 0, total_paid: 30000,
    });
    expect(row.progress).toBe('partial');
    expect(row.buckets[1].status).toBe('partial');
    expect(row.detail).toMatch(/1re tranche partielle/i);
  });

  it('détecte jusqu’à la 1re tranche', () => {
    const row = buildPensionSuiviRow(eleve, schedule, {
      inscription_paid: 20000, tranche1_paid: 30000, tranche2_paid: 0, tranche3_paid: 0, total_paid: 50000,
    });
    expect(row.progress).toBe('tranche1');
    expect(matchesSuiviFilter(row, 'tranche1')).toBe(true);
  });

  it('détecte la totalité soldée', () => {
    const row = buildPensionSuiviRow(eleve, schedule, {
      inscription_paid: 20000, tranche1_paid: 30000, tranche2_paid: 30000, tranche3_paid: 20000, total_paid: 100000,
    });
    expect(row.progress).toBe('solde');
    expect(row.reste).toBe(0);
  });

  it('filtre inscription / partiel / soldé', () => {
    const inscription = buildPensionSuiviRow(eleve, schedule, {
      inscription_paid: 20000, total_paid: 20000,
    });
    const partial = buildPensionSuiviRow(eleve, schedule, {
      inscription_paid: 15000, total_paid: 15000,
    });
    expect(matchesSuiviFilter(inscription, 'inscription')).toBe(true);
    expect(matchesSuiviFilter(partial, 'partial')).toBe(true);
    expect(matchesSuiviFilter(inscription, 'solde')).toBe(false);
  });
});
