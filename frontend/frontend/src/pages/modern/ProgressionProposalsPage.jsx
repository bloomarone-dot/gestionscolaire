import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Play, XCircle } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, DataTable, Input, Modal, PageHeader, Select } from '../../components/ui';

const STATUS_TONES = {
  PROPOSED: 'amber',
  ACCEPTED: 'emerald',
  MODIFIED: 'blue',
  REJECTED: 'rose',
  POSTPONED: 'slate',
  APPLIED: 'emerald',
};

export default function ProgressionProposalsPage() {
  const [classes, setClasses] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [classeId, setClasseId] = useState('');
  const [annee, setAnnee] = useState('');
  const [targetAnnee, setTargetAnnee] = useState('');
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [editRow, setEditRow] = useState(null);

  useEffect(() => {
    Promise.all([
      api.fetchClasses().catch(() => []),
      api.fetchProgressionDecisions().catch(() => []),
    ]).then(([cls, dec]) => {
      setClasses(Array.isArray(cls) ? cls : []);
      setDecisions(Array.isArray(dec) ? dec : []);
    });
  }, []);

  const loadProposals = useCallback(async () => {
    if (!annee) return;
    setLoading(true);
    try {
      const rows = await api.fetchProgressionProposals({
        classe_id: classeId || undefined,
        annee_scolaire: annee,
      });
      setProposals(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [classeId, annee]);

  useEffect(() => { loadProposals(); }, [loadProposals]);

  async function handleCompute() {
    if (!classeId || !annee) {
      setError('Choisissez une classe et une année scolaire.');
      return;
    }
    setComputing(true);
    setError('');
    try {
      const res = await api.computeProgressionProposals({
        classe_id: Number(classeId),
        annee_scolaire: annee,
        replace_existing: true,
      });
      setNotice(`${res.created} proposition(s) créée(s), ${res.updated} mise(s) à jour.`);
      loadProposals();
    } catch (err) {
      setError(err.message || 'Calcul impossible.');
    } finally {
      setComputing(false);
    }
  }

  async function validate(proposalId, action, extra = {}) {
    try {
      await api.validateProgressionProposal(proposalId, { action, ...extra });
      setNotice(`Proposition ${action === 'ACCEPT' ? 'acceptée' : action === 'REJECT' ? 'rejetée' : action === 'POSTPONE' ? 'reportée' : 'modifiée'}.`);
      setEditRow(null);
      loadProposals();
    } catch (err) {
      setError(err.message);
    }
  }

  async function prepareEnrollments() {
    if (!annee || !targetAnnee) {
      setError('Indiquez l\'année source et l\'année cible.');
      return;
    }
    try {
      const rows = await api.prepareNextYearEnrollments({
        annee_scolaire: annee,
        target_annee_scolaire: targetAnnee,
        classe_id: classeId ? Number(classeId) : null,
      });
      setNotice(`${rows.length} inscription(s) préparée(s) pour ${targetAnnee}.`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function applyEnrollments() {
    if (!targetAnnee) {
      setError('Indiquez l\'année cible.');
      return;
    }
    try {
      const res = await api.applyNextYearEnrollments({ target_annee_scolaire: targetAnnee });
      setNotice(`${res.applied ?? 0} inscription(s) appliquée(s).`);
      loadProposals();
    } catch (err) {
      setError(err.message);
    }
  }

  const decisionMap = useMemo(() => {
    const m = {};
    decisions.forEach((d) => { m[d.code] = d.label; });
    return m;
  }, [decisions]);

  const tableRows = proposals.map((p) => ({
    ...p,
    decision_label: decisionMap[p.proposed_decision_code || p.computed_decision_code] || p.proposed_decision_code || '—',
    status_tone: STATUS_TONES[p.status] || 'slate',
    moyenne: p.criteria_snapshot?.moyenne_generale ?? '—',
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Validation des décisions"
        description="Le moteur calcule des propositions — aucune décision n'est appliquée automatiquement. Un responsable doit accepter, modifier ou rejeter chaque proposition."
      />

      {notice && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Classe</label>
            <Select value={classeId} onChange={(e) => setClasseId(e.target.value)}>
              <option value="">— Choisir —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.nom || c.nom_personnalise}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Année scolaire</label>
            <Input placeholder="2025-2026" value={annee} onChange={(e) => setAnnee(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Année cible (inscriptions)</label>
            <Input placeholder="2026-2027" value={targetAnnee} onChange={(e) => setTargetAnnee(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleCompute} disabled={computing}>
              <Play size={16} /> {computing ? 'Calcul…' : 'Calculer'}
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={prepareEnrollments}>
            <Clock size={16} /> Préparer inscriptions N+1
          </Button>
          <Button variant="secondary" onClick={applyEnrollments}>
            <CheckCircle2 size={16} /> Appliquer inscriptions validées
          </Button>
        </div>
      </div>

      <DataTable
        title="Propositions de décision"
        columns={[
          { key: 'eleve_id', label: 'Élève ID' },
          { key: 'decision_label', label: 'Décision proposée' },
          { key: 'moyenne', label: 'Moyenne' },
          { key: 'status', label: 'Statut', render: (r) => <Badge tone={r.status_tone}>{r.status}</Badge> },
          { key: 'compute_rationale', label: 'Justification' },
        ]}
        rows={loading ? [] : tableRows}
        emptyMessage={loading ? 'Chargement…' : 'Aucune proposition — lancez un calcul.'}
        renderActions={(row) => (
          <div className="flex justify-end gap-1">
            {row.status === 'PROPOSED' && (
              <>
                <Button variant="ghost" className="px-2 text-xs" onClick={() => validate(row.id, 'ACCEPT')} title="Accepter">
                  <CheckCircle2 size={14} />
                </Button>
                <Button variant="ghost" className="px-2 text-xs" onClick={() => setEditRow(row)} title="Modifier">
                  Modifier
                </Button>
                <Button variant="ghost" className="px-2 text-xs" onClick={() => validate(row.id, 'POSTPONE')} title="Reporter">
                  <Clock size={14} />
                </Button>
                <Button variant="ghost" className="px-2 text-xs" onClick={() => validate(row.id, 'REJECT')} title="Rejeter">
                  <XCircle size={14} />
                </Button>
              </>
            )}
          </div>
        )}
      />

      <Modal
        title="Modifier la proposition"
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditRow(null)}>Annuler</Button>
            <Button onClick={() => validate(editRow.id, 'MODIFY', {
              decision_code: editRow.proposed_decision_code,
              dest_classe_id: editRow.proposed_dest_classe_id ? Number(editRow.proposed_dest_classe_id) : null,
              motif: editRow.motif,
              comment: editRow.comment,
            })}>Enregistrer</Button>
          </div>
        )}
      >
        {editRow && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Décision</label>
              <Select
                value={editRow.proposed_decision_code || ''}
                onChange={(e) => setEditRow({ ...editRow, proposed_decision_code: e.target.value })}
              >
                {decisions.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Classe destination</label>
              <Select
                value={editRow.proposed_dest_classe_id || ''}
                onChange={(e) => setEditRow({ ...editRow, proposed_dest_classe_id: e.target.value })}
              >
                <option value="">— Aucune —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.nom || c.nom_personnalise}</option>)}
              </Select>
            </div>
            <Input placeholder="Motif" value={editRow.motif || ''} onChange={(e) => setEditRow({ ...editRow, motif: e.target.value })} />
            <Input placeholder="Commentaire" value={editRow.comment || ''} onChange={(e) => setEditRow({ ...editRow, comment: e.target.value })} />
          </div>
        )}
      </Modal>
    </div>
  );
}
