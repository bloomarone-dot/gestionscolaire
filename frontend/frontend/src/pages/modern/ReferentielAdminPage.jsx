import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Save, Trash2 } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, Card, DataTable, Input, PageHeader, Select } from '../../components/ui';

// §1 — Gestion du référentiel national : réservé à l'admin plateforme (superadmin).
function Notice({ notice }) {
  if (!notice) return null;
  const tone = notice.tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700';
  return <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${tone}`}>{notice.message}</div>;
}

// ── Liste (matières + éligibilités) ─────────────────────────────────────────
export default function ReferentielAdminPage() {
  const [subjects, setSubjects] = useState([]);
  const [eligibility, setEligibility] = useState([]);
  const [notice, setNotice] = useState(null);
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

  async function removeEligibility(row) {
    if (!window.confirm('Supprimer cette éligibilité ?')) return;
    try { await api.deleteReferentielEligibility(row.id); reload(); }
    catch (err) { setNotice({ message: err.message, tone: 'rose' }); }
  }

  return (
    <div>
      <PageHeader title="Référentiel national" breadcrumb="Plateforme" description="Matières officielles et éligibilités (niveau / série / coefficient). Réservé à l'administrateur de la plateforme." />
      <Notice notice={notice} />

      <Card className="mb-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Matières officielles</h2>
          <Link to="/superadmin/referentiel/matiere/nouveau"><Button><Plus size={16} /> Nouvelle matière</Button></Link>
        </div>
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
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Éligibilités (matière ↔ niveau ↔ série)</h2>
          <Link to="/superadmin/referentiel/eligibilite/nouveau"><Button><Plus size={16} /> Nouvelle éligibilité</Button></Link>
        </div>
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
      </Card>
    </div>
  );
}

// ── Création d'une matière ──────────────────────────────────────────────────
export function SubjectCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ code: '', name: '' });
  const [notice, setNotice] = useState(null);

  async function submit(e) {
    e.preventDefault();
    try {
      await api.createReferentielSubject({ code: form.code.trim(), name: form.name.trim() });
      navigate('/superadmin/referentiel');
    } catch (err) { setNotice({ message: err.message, tone: 'rose' }); }
  }

  return (
    <div>
      <PageHeader title="Nouvelle matière" breadcrumb="Référentiel national"
        actions={<Link to="/superadmin/referentiel"><Button variant="secondary">Retour à la liste</Button></Link>} />
      <Notice notice={notice} />
      <Card className="p-5">
        <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
          <Input className="w-40" required placeholder="Code (ex. MATH)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <Input className="w-64" required placeholder="Nom de la matière" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Link to="/superadmin/referentiel"><Button type="button" variant="secondary">Annuler</Button></Link>
          <Button><Plus size={16} /> Ajouter la matière</Button>
        </form>
      </Card>
    </div>
  );
}

// ── Création d'une éligibilité ──────────────────────────────────────────────
export function EligibilityCreatePage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ subject_code: '', level_code: '', series_code: '', default_coefficient: 1, is_obligatoire: false, groupe: '' });
  const [notice, setNotice] = useState(null);

  useEffect(() => { api.adminListSubjects().then((d) => setSubjects(Array.isArray(d) ? d : [])).catch(() => setSubjects([])); }, []);

  async function submit(e) {
    e.preventDefault();
    try {
      await api.createReferentielEligibility({
        subject_code: form.subject_code,
        level_code: form.level_code.trim(),
        series_code: form.series_code.trim() || null,
        default_coefficient: Number(form.default_coefficient),
        is_obligatoire: form.is_obligatoire,
        groupe: form.groupe ? Number(form.groupe) : null,
      });
      navigate('/superadmin/referentiel');
    } catch (err) { setNotice({ message: err.message, tone: 'rose' }); }
  }

  return (
    <div>
      <PageHeader title="Nouvelle éligibilité" breadcrumb="Référentiel national" description="Lie une matière à un niveau (et une série), avec coefficient officiel."
        actions={<Link to="/superadmin/referentiel"><Button variant="secondary">Retour à la liste</Button></Link>} />
      <Notice notice={notice} />
      <Card className="p-5">
        <form className="grid gap-3 md:grid-cols-3" onSubmit={submit}>
          <Select required value={form.subject_code} onChange={(e) => setForm({ ...form, subject_code: e.target.value })}>
            <option value="">Matière…</option>
            {subjects.map((s) => <option key={s.id} value={s.code}>{s.name}</option>)}
          </Select>
          <Input required placeholder="Niveau (ex. TLE)" value={form.level_code} onChange={(e) => setForm({ ...form, level_code: e.target.value })} />
          <Input placeholder="Série (ex. D)" value={form.series_code} onChange={(e) => setForm({ ...form, series_code: e.target.value })} />
          <Input type="number" step="0.5" min="0" placeholder="Coefficient" value={form.default_coefficient} onChange={(e) => setForm({ ...form, default_coefficient: e.target.value })} />
          <Input type="number" min="1" placeholder="Groupe (optionnel)" value={form.groupe} onChange={(e) => setForm({ ...form, groupe: e.target.value })} />
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input type="checkbox" checked={form.is_obligatoire} onChange={(e) => setForm({ ...form, is_obligatoire: e.target.checked })} /> Obligatoire
          </label>
          <div className="md:col-span-3 flex justify-end gap-2">
            <Link to="/superadmin/referentiel"><Button type="button" variant="secondary">Annuler</Button></Link>
            <Button><Plus size={16} /> Ajouter l'éligibilité</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
