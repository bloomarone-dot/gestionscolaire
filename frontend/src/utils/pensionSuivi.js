/** Suivi scolarité : état inscription / tranches (payé, partiel, impayé, soldé). */

export const FEE_BUCKETS = [
  { key: 'inscription', dueKey: 'inscription', paidKey: 'inscription_paid', label: 'Inscription' },
  { key: 'tranche1', dueKey: 'tranche1', paidKey: 'tranche1_paid', label: '1re tranche' },
  { key: 'tranche2', dueKey: 'tranche2', paidKey: 'tranche2_paid', label: '2e tranche' },
  { key: 'tranche3', dueKey: 'tranche3', paidKey: 'tranche3_paid', label: '3e tranche' },
];

export const FEE_STATUS_META = {
  none: { label: '—', tone: 'slate', detail: '' },
  unpaid: { label: 'Impayé', tone: 'rose', detail: 'impayée' },
  partial: { label: 'Partiel', tone: 'amber', detail: 'partielle' },
  paid: { label: 'Payé', tone: 'emerald', detail: 'payée' },
};

export function feeBucketStatus(due, paid) {
  const d = Number(due) || 0;
  const p = Number(paid) || 0;
  if (d <= 0) return 'none';
  if (p <= 0) return 'unpaid';
  if (p + 0.009 >= d) return 'paid';
  return 'partial';
}

function schoolMonthRank(month) {
  if (!month) return -1;
  return (((Number(month) - 9) % 12) + 12) % 12;
}

export function buildPensionSuiviRow(eleve, schedule, compte, classesById = {}) {
  const due = {
    inscription: Number(schedule?.inscription || 0),
    tranche1: Number(schedule?.tranche1 || 0),
    tranche2: Number(schedule?.tranche2 || 0),
    tranche3: Number(schedule?.tranche3 || 0),
  };
  const paid = {
    inscription: Number(compte?.inscription_paid || 0),
    tranche1: Number(compte?.tranche1_paid || 0),
    tranche2: Number(compte?.tranche2_paid || 0),
    tranche3: Number(compte?.tranche3_paid || 0),
  };
  const buckets = FEE_BUCKETS.map((def) => {
    const status = feeBucketStatus(due[def.key], paid[def.key]);
    return {
      ...def,
      due: due[def.key],
      paid: paid[def.key],
      status,
    };
  });

  const totalDue = FEE_BUCKETS.reduce((sum, def) => sum + due[def.key], 0);
  const totalPaid = Number(compte?.total_paid || 0);
  const reste = Math.max(0, totalDue - totalPaid);

  const nowRank = schoolMonthRank(new Date().getMonth() + 1);
  let expectedNow = 0;
  if (schedule) {
    expectedNow = due.inscription;
    [
      ['tranche1', 't1_start_month'],
      ['tranche2', 't2_start_month'],
      ['tranche3', 't3_start_month'],
    ].forEach(([amt, startKey]) => {
      const start = schedule[startKey];
      if (!start || nowRank >= schoolMonthRank(start)) expectedNow += due[amt];
    });
  }

  let statut = 'unknown';
  if (totalDue === 0) statut = 'unknown';
  else if (reste <= 0 || totalPaid >= expectedNow) statut = 'ok';
  else statut = 'late';

  const active = buckets.filter((b) => b.status !== 'none');
  const allPaid = active.length > 0 && active.every((b) => b.status === 'paid');
  const anyPartial = buckets.some((b) => b.status === 'partial');
  const inscriptionPaid = buckets[0].status === 'paid';
  const laterUnpaid = buckets.slice(1).every((b) => b.status === 'unpaid' || b.status === 'none');
  const t1Paid = buckets[1].status === 'paid';
  const afterT1Unpaid = buckets.slice(2).every((b) => b.status === 'unpaid' || b.status === 'none');

  let progress = 'unknown';
  if (totalDue === 0) progress = 'unknown';
  else if (reste <= 0 || allPaid) progress = 'solde';
  else if (anyPartial) progress = 'partial';
  else if (inscriptionPaid && laterUnpaid) progress = 'inscription';
  else if (inscriptionPaid && t1Paid && afterT1Unpaid) progress = 'tranche1';
  else progress = 'in_progress';

  const detail = active
    .map((b) => `${b.label} ${FEE_STATUS_META[b.status].detail}`)
    .join(' · ') || 'Frais non configurés';

  return {
    id: eleve.id,
    student: [eleve.nom, eleve.prenom].filter(Boolean).join(' ') || `ID ${eleve.id}`,
    matricule: eleve.matricule || '—',
    classe: eleve.classe_id ? (classesById[eleve.classe_id] || `#${eleve.classe_id}`) : '—',
    classe_id: eleve.classe_id,
    totalDue,
    totalPaid,
    reste,
    due_label: totalDue ? `${totalDue.toLocaleString('fr-FR')} XAF` : '—',
    paid_label: `${totalPaid.toLocaleString('fr-FR')} XAF`,
    reste_label: totalDue ? `${reste.toLocaleString('fr-FR')} XAF` : '—',
    statut,
    progress,
    buckets,
    detail,
  };
}

export function matchesSuiviFilter(row, statutFilter) {
  if (!statutFilter) return true;
  if (statutFilter === 'ok' || statutFilter === 'late' || statutFilter === 'unknown') {
    return row.statut === statutFilter;
  }
  return row.progress === statutFilter;
}
