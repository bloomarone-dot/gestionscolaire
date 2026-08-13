import { useCallback, useEffect, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, DataTable, Input, PageHeader, Select } from '../../components/ui';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import { EXAM_CODES, EXAM_RESULTS } from '../../utils/vieScolaire';

export default function ExamensPage() {
  const { schoolName } = useEstablishmentProfile();
  const [examCode, setExamCode] = useState('BEPC');
  const [sessionLabel, setSessionLabel] = useState(String(new Date().getFullYear()));
  const [eligible, setEligible] = useState([]);
  const [candidats, setCandidats] = useState([]);
  const [notice, setNotice] = useState('');
  const [centre, setCentre] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [el, cand] = await Promise.all([
        api.fetchExamensEligible(examCode),
        api.fetchExamCandidats({ examCode, sessionLabel }),
      ]);
      setEligible(Array.isArray(el) ? el : []);
      setCandidats(Array.isArray(cand) ? cand : []);
      setNotice('');
    } catch (err) {
      setNotice(err.message);
    } finally {
      setLoading(false);
    }
  }, [examCode, sessionLabel]);

  useEffect(() => { load(); }, [load]);

  const registeredIds = new Set(candidats.map((c) => c.eleve_id));

  async function registerAll() {
    setLoading(true);
    try {
      let n = 0;
      for (const e of eligible) {
        if (registeredIds.has(e.eleve_id)) continue;
        n += 1;
        await api.upsertExamCandidat({
          eleve_id: e.eleve_id,
          exam_code: examCode,
          session_label: sessionLabel,
          classe_id: e.classe_id,
          centre: centre || null,
          numero_table: String(n).padStart(3, '0'),
          resultat: 'INSCRIT',
        });
      }
      setNotice(`${n} candidat(s) inscrit(s).`);
      await load();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateCandidat(row, patch) {
    try {
      await api.upsertExamCandidat({
        eleve_id: row.eleve_id,
        exam_code: row.exam_code,
        session_label: row.session_label,
        classe_id: row.classe_id,
        centre: patch.centre ?? row.centre,
        numero_table: patch.numero_table ?? row.numero_table,
        matieres: patch.matieres ?? row.matieres,
        resultat: patch.resultat ?? row.resultat,
      });
      await load();
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function remove(row) {
    if (!window.confirm('Retirer ce candidat ?')) return;
    try {
      await api.deleteExamCandidat(row.id);
      await load();
    } catch (err) {
      setNotice(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Examens officiels"
        description="Listes BEPC, Probatoire, Bac, GCE — n° de table, centre et résultats."
      />
      {notice && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{notice}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Examen</label>
          <Select value={examCode} onChange={(e) => setExamCode(e.target.value)}>
            {EXAM_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Session</label>
          <Input value={sessionLabel} onChange={(e) => setSessionLabel(e.target.value)} className="w-28" />
        </div>
        <div className="min-w-[200px]">
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Centre (défaut)</label>
          <Input value={centre} onChange={(e) => setCentre(e.target.value)} placeholder="Ex. Lycée de ..." />
        </div>
        <Button onClick={registerAll} disabled={loading}>
          <Plus size={16} /> Inscrire les éligibles ({eligible.length})
        </Button>
        <Button
          variant="secondary"
          onClick={() => api.downloadExamListPdf(examCode, sessionLabel, schoolName).catch((e) => setNotice(e.message))}
        >
          <Download size={16} /> Liste PDF
        </Button>
      </div>

      <p className="text-sm text-slate-500">
        Élèves éligibles (niveau examen) : <strong>{eligible.length}</strong>
        {' · '}déjà inscrits : <strong>{candidats.length}</strong>
      </p>

      <DataTable
        title={`Candidats ${examCode} — ${sessionLabel}`}
        columns={[
          { key: 'eleve_nom', label: 'Élève' },
          { key: 'matricule', label: 'Matricule' },
          {
            key: 'numero_table',
            label: 'N° table',
            render: (row) => (
              <Input
                className="w-24"
                value={row.numero_table || ''}
                onBlur={(e) => {
                  if (e.target.value !== (row.numero_table || '')) {
                    updateCandidat(row, { numero_table: e.target.value });
                  }
                }}
                defaultValue={row.numero_table || ''}
                key={`t-${row.id}-${row.numero_table}`}
              />
            ),
          },
          {
            key: 'centre',
            label: 'Centre',
            render: (row) => (
              <Input
                value={row.centre || ''}
                onBlur={(e) => {
                  if (e.target.value !== (row.centre || '')) {
                    updateCandidat(row, { centre: e.target.value });
                  }
                }}
                defaultValue={row.centre || ''}
                key={`c-${row.id}-${row.centre}`}
              />
            ),
          },
          {
            key: 'resultat',
            label: 'Résultat',
            render: (row) => (
              <Select
                value={row.resultat}
                onChange={(e) => updateCandidat(row, { resultat: e.target.value })}
              >
                {EXAM_RESULTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </Select>
            ),
          },
          {
            key: 'badge',
            label: '',
            render: (row) => (
              <Badge tone={row.resultat === 'ADMIS' ? 'emerald' : row.resultat === 'ECHOUE' ? 'rose' : 'slate'}>
                {row.resultat}
              </Badge>
            ),
          },
        ]}
        rows={loading ? [] : candidats}
        emptyMessage={loading ? 'Chargement…' : 'Aucun candidat. Inscrivez les élèves éligibles.'}
        renderActions={(row) => (
          <Button variant="danger" className="px-2" onClick={() => remove(row)}><Trash2 size={16} /></Button>
        )}
      />
    </div>
  );
}
