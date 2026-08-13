import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, DataTable, Input, Modal, PageHeader, Select } from '../../components/ui';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import { SANCTION_KINDS, sanctionLabel } from '../../utils/vieScolaire';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function DisciplinePage() {
  const { schoolName } = useEstablishmentProfile();
  const [classes, setClasses] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [rows, setRows] = useState([]);
  const [classeFilter, setClasseFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    eleve_id: '', kind: 'AVERTISSEMENT', jour: todayIso(), motif: '',
    duree_jours: '', convocation_at: '',
  });

  useEffect(() => {
    api.fetchClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    const loader = classeFilter
      ? api.fetchEleves_admin(classeFilter)
      : api.fetchEleves_admin();
    loader.then(setEleves).catch(() => setEleves([]));
  }, [classeFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.fetchSanctions({
        classeId: classeFilter || undefined,
        kind: kindFilter || undefined,
      });
      setRows(Array.isArray(data) ? data : []);
      setNotice('');
    } catch (err) {
      setNotice(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [classeFilter, kindFilter]);

  useEffect(() => { load(); }, [load]);

  const elevesOptions = useMemo(() => eleves.map((e) => ({
    id: e.id,
    label: `${[e.nom, e.prenom].filter(Boolean).join(' ')} (${e.matricule || e.id})`,
  })), [eleves]);

  async function submit() {
    if (!form.eleve_id || !form.motif.trim()) {
      setNotice('Élève et motif obligatoires.');
      return;
    }
    try {
      const payload = {
        eleve_id: Number(form.eleve_id),
        kind: form.kind,
        jour: form.jour,
        motif: form.motif.trim(),
        classe_id: classeFilter ? Number(classeFilter) : undefined,
        duree_jours: form.kind === 'EXCLUSION_TEMPORAIRE' && form.duree_jours
          ? Number(form.duree_jours) : null,
        convocation_at: form.kind === 'CONVOCATION' && form.convocation_at
          ? new Date(form.convocation_at).toISOString() : null,
      };
      await api.createSanction(payload);
      setOpen(false);
      setForm({ eleve_id: '', kind: 'AVERTISSEMENT', jour: todayIso(), motif: '', duree_jours: '', convocation_at: '' });
      setNotice('Mesure enregistrée — notification parent préparée.');
      await load();
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function remove(row) {
    if (!window.confirm('Supprimer cette fiche ?')) return;
    try {
      await api.deleteSanction(row.id);
      await load();
    } catch (err) {
      setNotice(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Discipline & vie scolaire"
        description="Avertissements, blâmes, exclusions temporaires et convocations des parents."
        actions={(
          <Button onClick={() => setOpen(true)}><Plus size={16} /> Nouvelle fiche</Button>
        )}
      />
      {notice && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{notice}</p>}
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[180px]">
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Classe</label>
          <Select value={classeFilter} onChange={(e) => setClasseFilter(e.target.value)}>
            <option value="">Toutes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.nom || c.nom_personnalise}</option>
            ))}
          </Select>
        </div>
        <div className="min-w-[200px]">
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Type</label>
          <Select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
            <option value="">Tous</option>
            {SANCTION_KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </Select>
        </div>
      </div>
      <DataTable
        title="Registre disciplinaire"
        columns={[
          { key: 'jour', label: 'Date', render: (r) => String(r.jour).slice(0, 10) },
          { key: 'eleve_nom', label: 'Élève' },
          { key: 'matricule', label: 'Matricule' },
          {
            key: 'kind',
            label: 'Mesure',
            render: (r) => (
              <Badge tone={r.kind === 'BLAME' || r.kind === 'EXCLUSION_TEMPORAIRE' ? 'rose' : r.kind === 'CONVOCATION' ? 'amber' : 'slate'}>
                {sanctionLabel(r.kind)}
              </Badge>
            ),
          },
          { key: 'motif', label: 'Motif' },
        ]}
        rows={loading ? [] : rows}
        emptyMessage={loading ? 'Chargement…' : 'Aucune fiche.'}
        renderActions={(row) => (
          <div className="flex justify-end gap-2">
            {(row.kind === 'CONVOCATION' || row.kind === 'AVERTISSEMENT' || row.kind === 'BLAME') && (
              <Button
                variant="secondary"
                className="px-2"
                title="PDF convocation"
                onClick={() => api.downloadConvocationPdf(row.id, schoolName).catch((e) => setNotice(e.message))}
              >
                <Download size={16} />
              </Button>
            )}
            <Button variant="danger" className="px-2" onClick={() => remove(row)}><Trash2 size={16} /></Button>
          </div>
        )}
      />
      <Modal
        title="Nouvelle mesure"
        open={open}
        onClose={() => setOpen(false)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit}>Enregistrer</Button>
          </div>
        )}
      >
        <div className="space-y-3">
          <Select value={form.eleve_id} onChange={(e) => setForm({ ...form, eleve_id: e.target.value })}>
            <option value="">Élève…</option>
            {elevesOptions.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </Select>
          <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {SANCTION_KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </Select>
          <Input type="date" value={form.jour} onChange={(e) => setForm({ ...form, jour: e.target.value })} />
          <Input placeholder="Motif" value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} />
          {form.kind === 'EXCLUSION_TEMPORAIRE' && (
            <Input type="number" min="1" placeholder="Durée (jours)" value={form.duree_jours} onChange={(e) => setForm({ ...form, duree_jours: e.target.value })} />
          )}
          {form.kind === 'CONVOCATION' && (
            <Input type="datetime-local" value={form.convocation_at} onChange={(e) => setForm({ ...form, convocation_at: e.target.value })} />
          )}
        </div>
      </Modal>
    </div>
  );
}
