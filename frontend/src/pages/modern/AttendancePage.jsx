import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, DataTable, PageHeader, Select } from '../../components/ui';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const { labels: ui } = useEstablishmentProfile();
  const [classes, setClasses] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [classeId, setClasseId] = useState('');
  const [jour, setJour] = useState(todayIso());
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.fetchClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  const load = useCallback(async () => {
    if (!classeId) {
      setEleves([]);
      return;
    }
    setLoading(true);
    try {
      const [list, existing] = await Promise.all([
        api.fetchEleves_admin(classeId),
        api.fetchPresences(classeId, jour).catch(() => []),
      ]);
      setEleves(Array.isArray(list) ? list : []);
      const next = {};
      (Array.isArray(list) ? list : []).forEach((e) => { next[e.id] = 'PRESENT'; });
      (Array.isArray(existing) ? existing : []).forEach((p) => { next[p.eleve_id] = p.statut; });
      setMarks(next);
      setNotice('');
    } catch (err) {
      setNotice(err.message);
    } finally {
      setLoading(false);
    }
  }, [classeId, jour]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => eleves.map((e) => ({
    id: e.id,
    student: [e.nom, e.prenom].filter(Boolean).join(' ') || `ID ${e.id}`,
    matricule: e.matricule || '—',
    statut: marks[e.id] || 'PRESENT',
  })), [eleves, marks]);

  async function save() {
    if (!classeId) return;
    setLoading(true);
    try {
      await api.saveAppel({
        classe_id: Number(classeId),
        jour,
        items: eleves.map((e) => ({ eleve_id: e.id, statut: marks[e.id] || 'PRESENT' })),
      });
      const absents = eleves.filter((e) => marks[e.id] === 'ABSENT').length;
      setNotice(absents
        ? `Appel enregistré. ${absents} absence(s) — SMS/WhatsApp envoyé(s) aux parents.`
        : 'Appel enregistré. Tous présents.');
    } catch (err) {
      setNotice(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Présences"
        description="Appel du matin par classe. Une absence déclenche un SMS / WhatsApp au parent."
      />
      {notice && (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{notice}</p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{ui.class || 'Classe'}</label>
          <Select value={classeId} onChange={(e) => setClasseId(e.target.value)}>
            <option value="">Choisir…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.nom || c.nom_personnalise || `Classe ${c.id}`}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Date</label>
          <input
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            value={jour}
            onChange={(e) => setJour(e.target.value)}
          />
        </div>
        <Button onClick={save} disabled={!classeId || loading || !eleves.length}>
          <ClipboardCheck size={16} /> {loading ? 'Enregistrement…' : "Valider l'appel"}
        </Button>
      </div>
      <DataTable
        title="Appel"
        columns={[
          { key: 'student', label: ui.student || 'Élève' },
          { key: 'matricule', label: 'Matricule' },
          {
            key: 'statut',
            label: 'Présence',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                {['PRESENT', 'ABSENT', 'RETARD'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setMarks((m) => ({ ...m, [row.id]: s }))}
                    className="rounded-full"
                  >
                    <Badge tone={row.statut === s ? (s === 'ABSENT' ? 'rose' : s === 'RETARD' ? 'amber' : 'emerald') : 'slate'}>
                      {s === 'PRESENT' ? 'Présent' : s === 'ABSENT' ? 'Absent' : 'Retard'}
                    </Badge>
                  </button>
                ))}
              </div>
            ),
          },
        ]}
        rows={loading ? [] : rows}
        emptyMessage={classeId ? (loading ? 'Chargement…' : 'Aucun élève dans cette classe.') : 'Choisissez une classe.'}
      />
    </div>
  );
}
