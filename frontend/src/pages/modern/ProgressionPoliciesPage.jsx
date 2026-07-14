import { useCallback, useEffect, useState } from 'react';
import { Copy, Plus, Power, PowerOff, Save } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, Card, DataTable, Input, Modal, PageHeader, Select } from '../../components/ui';

const EMPTY_POLICY = {
  name: '',
  description: '',
  annee_scolaire: '',
  valid_from: '',
  valid_to: '',
  classe_ids: '',
  cycle_codes: '',
  priority: 100,
  is_active: false,
  rules_json: JSON.stringify([
    {
      name: 'Passage si moyenne >= 10',
      priority: 10,
      logic: 'AND',
      conditions: [{ criterion: 'moyenne_generale', operator: '>=', value: 10 }],
      decision_code: 'PASSAGE',
      dest_action: 'AUTO',
      rationale: 'Moyenne annuelle suffisante',
    },
    {
      name: 'Redoublement si moyenne < 10',
      priority: 20,
      logic: 'AND',
      conditions: [{ criterion: 'moyenne_generale', operator: '<', value: 10 }],
      decision_code: 'REDOUBLEMENT',
      dest_action: 'SAME_CLASS',
      rationale: 'Moyenne insuffisante',
    },
  ], null, 2),
  exceptions_json: '[]',
};

function parseIds(text) {
  if (!text?.trim()) return null;
  return text.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
}

function parseCodes(text) {
  if (!text?.trim()) return null;
  return text.split(',').map((s) => s.trim()).filter(Boolean);
}

export default function ProgressionPoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_POLICY);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, d] = await Promise.all([
        api.fetchProgressionPolicies(),
        api.fetchProgressionCriteria(),
        api.fetchProgressionDecisions(),
      ]);
      setPolicies(Array.isArray(p) ? p : []);
      setCriteria(Array.isArray(c) ? c : []);
      setDecisions(Array.isArray(d) ? d : []);
    } catch (err) {
      setError(err.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY_POLICY);
    setModal({ mode: 'create' });
  }

  function openEdit(row) {
    setForm({
      name: row.name,
      description: row.description || '',
      annee_scolaire: row.annee_scolaire || '',
      valid_from: row.valid_from || '',
      valid_to: row.valid_to || '',
      classe_ids: (row.classe_ids || []).join(', '),
      cycle_codes: (row.cycle_codes || []).join(', '),
      priority: row.priority ?? 100,
      is_active: row.is_active,
      rules_json: JSON.stringify(row.rules || [], null, 2),
      exceptions_json: JSON.stringify(row.exceptions || [], null, 2),
    });
    setModal({ mode: 'edit', id: row.id });
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      let rules;
      let exceptions;
      try {
        rules = JSON.parse(form.rules_json);
        exceptions = JSON.parse(form.exceptions_json);
      } catch {
        throw new Error('JSON des règles ou exceptions invalide.');
      }
      const payload = {
        name: form.name,
        description: form.description || null,
        annee_scolaire: form.annee_scolaire || null,
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        classe_ids: parseIds(form.classe_ids),
        cycle_codes: parseCodes(form.cycle_codes),
        priority: Number(form.priority) || 100,
        is_active: form.is_active,
        rules,
        exceptions,
      };
      if (modal?.mode === 'edit') {
        await api.updateProgressionPolicy(modal.id, payload);
        setNotice('Politique mise à jour.');
      } else {
        await api.createProgressionPolicy(payload);
        setNotice('Politique créée.');
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row, active) {
    try {
      if (active) await api.activateProgressionPolicy(row.id);
      else await api.deactivateProgressionPolicy(row.id);
      setNotice(active ? 'Politique activée.' : 'Politique désactivée.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function versionPolicy(row) {
    try {
      await api.versionProgressionPolicy(row.id);
      setNotice(`Nouvelle version créée (v${row.version + 1}).`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const rows = policies.map((p) => ({
    ...p,
    scope: [
      p.annee_scolaire ? `Année ${p.annee_scolaire}` : 'Toutes années',
      p.classe_ids?.length ? `${p.classe_ids.length} classe(s)` : 'Toutes classes',
      p.cycle_codes?.length ? p.cycle_codes.join(', ') : 'Tous cycles',
    ].join(' · '),
    status_label: p.is_active ? 'Active' : 'Inactive',
    status_tone: p.is_active ? 'emerald' : 'slate',
    version_label: `v${p.version}`,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Politiques de progression"
        description="Créez, versionnez et activez des politiques limitées par classe, cycle ou année scolaire. Les décisions et critères sont configurables."
        actions={<Button onClick={openCreate}><Plus size={16} /> Nouvelle politique</Button>}
      />

      {notice && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-bold text-slate-800">Décisions configurables</h3>
          <ul className="space-y-1 text-sm text-slate-600">
            {decisions.map((d) => (
              <li key={d.id}><b>{d.label}</b> <span className="text-xs text-slate-400">({d.code})</span></li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-bold text-slate-800">Critères disponibles ({criteria.length})</h3>
          <p className="text-xs text-slate-500 mb-2">Extensibles sans modifier l'architecture du moteur.</p>
          <div className="flex flex-wrap gap-1">
            {criteria.map((c) => (
              <Badge key={c.code} tone="blue">{c.label}</Badge>
            ))}
          </div>
        </Card>
      </div>

      <DataTable
        title="Politiques"
        columns={[
          { key: 'name', label: 'Nom' },
          { key: 'version_label', label: 'Version' },
          { key: 'priority', label: 'Priorité' },
          { key: 'scope', label: 'Périmètre' },
          { key: 'status_label', label: 'Statut', render: (r) => <Badge tone={r.status_tone}>{r.status_label}</Badge> },
        ]}
        rows={loading ? [] : rows}
        emptyMessage={loading ? 'Chargement…' : 'Aucune politique.'}
        renderActions={(row) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" className="px-2" title="Modifier" onClick={() => openEdit(row)}><Save size={14} /></Button>
            <Button variant="ghost" className="px-2" title="Nouvelle version" onClick={() => versionPolicy(row)}><Copy size={14} /></Button>
            {row.is_active ? (
              <Button variant="ghost" className="px-2" title="Désactiver" onClick={() => toggleActive(row, false)}><PowerOff size={14} /></Button>
            ) : (
              <Button variant="ghost" className="px-2" title="Activer" onClick={() => toggleActive(row, true)}><Power size={14} /></Button>
            )}
          </div>
        )}
      />

      <Modal
        title={modal?.mode === 'edit' ? 'Modifier la politique' : 'Nouvelle politique'}
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </div>
        )}
      >
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          <Input placeholder="Nom *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Année scolaire (ex. 2025-2026)" value={form.annee_scolaire} onChange={(e) => setForm({ ...form, annee_scolaire: e.target.value })} />
            <Input type="number" placeholder="Priorité (plus petit = plus prioritaire)" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
            <Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
            <Input type="date" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} />
          </div>
          <Input placeholder="Classes limitées (IDs séparés par virgule, vide = toutes)" value={form.classe_ids} onChange={(e) => setForm({ ...form, classe_ids: e.target.value })} />
          <Input placeholder="Cycles limités (codes séparés par virgule)" value={form.cycle_codes} onChange={(e) => setForm({ ...form, cycle_codes: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Activer immédiatement
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Règles (JSON)</span>
            <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs" rows={10} value={form.rules_json} onChange={(e) => setForm({ ...form, rules_json: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Exceptions (JSON)</span>
            <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs" rows={4} value={form.exceptions_json} onChange={(e) => setForm({ ...form, exceptions_json: e.target.value })} />
          </label>
        </div>
      </Modal>
    </div>
  );
}
