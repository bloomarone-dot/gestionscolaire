import { useCallback, useEffect, useState } from 'react';
import { Library, Plus, Save, Trash2 } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, Card, DataTable, Input, PageHeader, Select } from '../../components/ui';

// §1 — Gestion du référentiel national : réservé à l'admin plateforme (superadmin).
function Notice({ notice }) {
  if (!notice) return null;
  const tone = notice.tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700';
  return <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${tone}`}>{notice.message}</div>;
}

export default function ReferentielAdminPage() {
  const [subjects, setSubjects] = useState([]);
  const [eligibility, setEligibility] = useState([]);
  const [notice, setNotice] = useState(null);
  const [subjectForm, setSubjectForm] = useState({ code: '', name: '' });
  const [eligForm, setEligForm] = useState({ subject_code: '', level_code: '', series_code: '', default_coefficient: 1, is_obligatoire: false, groupe: '' });
  const [editing, setEditing] = useState({}); // { [id]: name }

  const reload = useCallback(async () => {
    try {
      const [subs, eligs] = await Promise.all([api.adminListSubjects(), api.adminListEligibility()]);
      setSubjects(Array.isArray(subs) ? subs : []);
      setEligibility(Array.isArray(eligs) ? eligs : []);
    } catch (err) {
      setNotice({ message: err.message || 'Référentiel indisponible (réservé superadmin).', tone: 'rose' });
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  async function addSubject(e) {
    e.preventDefault();
    try {
      await api.createReferentielSubject({ code: subjectForm.code.trim(), name: subjectForm.name.trim() });
      setSubjectForm({ code: '', name: '' });
      setNotice({ message: 'Matière ajoutée au référentiel.', tone: 'emerald' });
      reload();
    } catch (err) { setNotice({ message: err.message, tone: 'rose' }); }
  }

  async function saveSubject(row) {
    const name = editing[row.id];
    if (!name || name === row.name) { setEditing((s) => { const n = { ...s }; delete n[row.id]; return n; }); return; }
    try {
      await api.updateReferentielSubject(row.id, name);
      setEditing((s) => { const n = { ...s }; delete n[row.id]; return n; });
      setNotice({ message: 'Matière mise à jour.', tone: 'emerald' });
      reload();
    } catch (err) { setNotice({ message: err.message, tone: 'rose' }); }
  }

  async function removeSubject(row) {
    if (!window.confirm(`Supprimer la matière « ${row.name} » et ses éligibilités ? (Les classes existantes conservent leur copie.)`)) return;
    try { await api.deleteReferentielSubject(row.id); setNotice({ message: 'Matière supprimée.', tone: 'emerald' }); reload(); }
    catch (err) { setNotice({ message: err.message, tone: 'rose' }); }
  }

  async function addEligibility(e) {
    e.preventDefault();
    try {
      await api.createReferentielEligibility({
        subject_code: eligForm.subject_code,
        level_code: eligForm.level_code.trim(),
        series_code: eligForm.series_code.trim() || null,
        default_coefficient: Number(eligForm.default_coefficient),
        is_obligatoire: eligForm.is_obligatoire,
        groupe: eligForm.groupe ? Number(eligForm.groupe) : null,
      });
      setEligForm({ subject_code: '', level_code: '', series_code: '', default_coefficient: 1, is_obligatoire: false, groupe: '' });
      setNotice({ message: 'Éligibilité ajoutée.', tone: 'emerald' });
      reload();
    } catch (err) { setNotice({ message: err.message, tone: 'rose' }); }
  }

  async function removeEligibility(row) {
    if (!window.confirm('Supprimer cette éligibilité ?')) return;
    try { await api.deleteReferentielEligibility(row.id); reload(); }
    catch (err) { setNotice({ message: err.message, tone: 'rose' }); }
  }

  return (
    <div>
      <PageHeader title="Référentiel national" breadcrumb="Plateforme" description="Gestion des matières officielles et de leurs éligibilités (niveau / série / coefficient). Réservé à l'administrateur de la plateforme." />
      <Notice notice={notice} />

      <Card className="mb-6 p-5">
        <h2 className="mb-4 font-bold">Matières officielles</h2>
        <DataTable
          title={`${subjects.length} matière(s)`}
          columns={[
            { key: 'code', label: 'Code', render: (r) => <Badge tone="slate">{r.code}</Badge> },
            { key: 'name', label: 'Nom', render: (r) => (
              editing[r.id] !== undefined
                ? <Input value={editing[r.id]} onChange={(e) => setEditing((s) => ({ ...s, [r.id]: e.target.value }))} />
                : r.name
            ) },
          ]}
          rows={subjects}
          renderActions={(r) => (
            <div className="flex justify-end gap-2">
              {editing[r.id] !== undefined
                ? <Button className="px-2" title="Enregistrer" onClick={() => saveSubject(r)}><Save size={16} /></Button>
                : <Button variant="secondary" className="px-2" title="Renommer" onClick={() => setEditing((s) => ({ ...s, [r.id]: r.name }))}><Save size={16} /></Button>}
              <Button variant="danger" className="px-2" title="Supprimer" onClick={() => removeSubject(r)}><Trash2 size={16} /></Button>
            </div>
          )}
        />
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={addSubject}>
          <Input className="w-40" required placeholder="Code (ex. MATH)" value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} />
          <Input className="w-64" required placeholder="Nom de la matière" value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} />
          <Button><Plus size={16} /> Ajouter la matière</Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-bold">Éligibilités (matière ↔ niveau ↔ série)</h2>
        <DataTable
          title={`${eligibility.length} éligibilité(s)`}
          columns={[
            { key: 'subject_name', label: 'Matière', render: (r) => `${r.subject_name} (${r.subject_code})` },
            { key: 'level_code', label: 'Niveau' },
            { key: 'series_code', label: 'Série', render: (r) => r.series_code || '—' },
            { key: 'default_coefficient', label: 'Coef.' },
            { key: 'is_obligatoire', label: 'Obligatoire', render: (r) => (r.is_obligatoire ? <Badge tone="amber">Oui</Badge> : 'Non') },
            { key: 'groupe', label: 'Groupe', render: (r) => r.groupe ?? '—' },
          ]}
          rows={eligibility}
          renderActions={(r) => <div className="flex justify-end"><Button variant="danger" className="px-2" title="Supprimer" onClick={() => removeEligibility(r)}><Trash2 size={16} /></Button></div>}
        />
        <form className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6" onSubmit={addEligibility}>
          <Select required value={eligForm.subject_code} onChange={(e) => setEligForm({ ...eligForm, subject_code: e.target.value })}>
            <option value="">Matière…</option>
            {subjects.map((s) => <option key={s.id} value={s.code}>{s.name}</option>)}
          </Select>
          <Input required placeholder="Niveau (ex. TLE)" value={eligForm.level_code} onChange={(e) => setEligForm({ ...eligForm, level_code: e.target.value })} />
          <Input placeholder="Série (ex. D)" value={eligForm.series_code} onChange={(e) => setEligForm({ ...eligForm, series_code: e.target.value })} />
          <Input type="number" step="0.5" min="0" placeholder="Coef." value={eligForm.default_coefficient} onChange={(e) => setEligForm({ ...eligForm, default_coefficient: e.target.value })} />
          <Input type="number" min="1" placeholder="Groupe" value={eligForm.groupe} onChange={(e) => setEligForm({ ...eligForm, groupe: e.target.value })} />
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input type="checkbox" checked={eligForm.is_obligatoire} onChange={(e) => setEligForm({ ...eligForm, is_obligatoire: e.target.checked })} /> Obligatoire
          </label>
          <Button className="md:col-span-3 lg:col-span-6 justify-self-start"><Plus size={16} /> Ajouter l'éligibilité</Button>
        </form>
      </Card>
    </div>
  );
}
