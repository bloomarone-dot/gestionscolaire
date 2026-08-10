import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import * as api from '../../api/api';
import { Button, Card, Input, Select } from '../ui';

const EMPTY = {
  classe_id: '',
  annee_scolaire: '',
  periode: '',
  level_code: '',
  cycle_code: '',
  series_code: '',
  priority: 100,
};

/**
 * Gestion des assignations d'un modèle PUBLISHED (API étape 7).
 */
export default function ModeleAssignationsPanel({ modeleId, canEdit, modeleStatus }) {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [annees, setAnnees] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const published = modeleStatus === 'PUBLISHED';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [assignations, cls, yrs] = await Promise.all([
        api.fetchBulletinModeleAssignations(modeleId),
        api.fetchClasses().catch(() => []),
        api.fetchAnneesScolaires().catch(() => []),
      ]);
      setRows(Array.isArray(assignations) ? assignations : []);
      setClasses(Array.isArray(cls) ? cls : []);
      setAnnees(Array.isArray(yrs) ? yrs : []);
    } catch (err) {
      setError(err.message || 'Chargement des assignations impossible');
    } finally {
      setLoading(false);
    }
  }, [modeleId]);

  useEffect(() => { load(); }, [load]);

  function patch(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!canEdit || !published) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const body = {
        priority: Number(form.priority) || 100,
        is_active: true,
      };
      if (form.classe_id) body.classe_id = Number(form.classe_id);
      if (form.annee_scolaire) body.annee_scolaire = form.annee_scolaire;
      if (form.periode) body.periode = form.periode;
      if (form.level_code) body.level_code = form.level_code;
      if (form.cycle_code) body.cycle_code = form.cycle_code;
      if (form.series_code) body.series_code = form.series_code;
      await api.createBulletinModeleAssignation(modeleId, body);
      setForm(EMPTY);
      setNotice('Assignation enregistrée.');
      await load();
    } catch (err) {
      setError(err.message || 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!canEdit || !window.confirm('Supprimer cette assignation ?')) return;
    try {
      await api.deleteBulletinModeleAssignation(modeleId, id);
      setNotice('Assignation supprimée.');
      await load();
    } catch (err) {
      setError(err.message || 'Suppression impossible');
    }
  }

  const classLabel = (id) => {
    const c = classes.find((x) => Number(x.id) === Number(id));
    return c ? (c.nom_personnalise || c.name || c.code || `#${id}`) : `Classe #${id}`;
  };

  return (
    <div data-testid="modele-assignations-panel">
    <Card className="mt-4 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Assignation</h3>
      <p className="mt-1 text-xs text-slate-500">
        Définit où ce modèle publié s&apos;applique (classe, niveau, cycle…). Priorité : classe &gt; niveau &gt; cycle &gt; défaut &gt; système.
      </p>

      {!published && (
        <p className="mt-2 text-sm text-amber-700">Publiez le modèle avant de créer une assignation opérationnelle.</p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-2 text-sm text-emerald-700">{notice}</p>}

      {published && canEdit && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs text-slate-500">
            Classe
            <Select className="mt-0.5" value={form.classe_id} onChange={(e) => patch('classe_id', e.target.value)} aria-label="Classe assignation">
              <option value="">—</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.nom_personnalise || c.name || c.code || c.id}</option>
              ))}
            </Select>
          </label>
          <label className="text-xs text-slate-500">
            Année scolaire
            <Select className="mt-0.5" value={form.annee_scolaire} onChange={(e) => patch('annee_scolaire', e.target.value)} aria-label="Année assignation">
              <option value="">—</option>
              {annees.map((a) => (
                <option key={a.id || a.libelle || a.annee} value={a.libelle || a.annee || a.name}>
                  {a.libelle || a.annee || a.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs text-slate-500">
            Période
            <Select className="mt-0.5" value={form.periode} onChange={(e) => patch('periode', e.target.value)} aria-label="Période assignation">
              <option value="">—</option>
              <option value="1">1er trimestre</option>
              <option value="2">2e trimestre</option>
              <option value="3">3e trimestre</option>
              <option value="annual">Annuel</option>
            </Select>
          </label>
          <label className="text-xs text-slate-500">
            Niveau (code)
            <Input className="mt-0.5" value={form.level_code} onChange={(e) => patch('level_code', e.target.value)} placeholder="ex. 3E" aria-label="Niveau assignation" />
          </label>
          <label className="text-xs text-slate-500">
            Cycle (code)
            <Input className="mt-0.5" value={form.cycle_code} onChange={(e) => patch('cycle_code', e.target.value)} placeholder="ex. COLLEGE" aria-label="Cycle assignation" />
          </label>
          <label className="text-xs text-slate-500">
            Priorité
            <Input className="mt-0.5" type="number" value={form.priority} onChange={(e) => patch('priority', e.target.value)} aria-label="Priorité assignation" />
          </label>
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <Button disabled={saving} onClick={handleSave}>
              <Plus className="h-4 w-4" /> Enregistrer l&apos;assignation
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune assignation.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-1 pr-2">Classe</th>
                <th className="py-1 pr-2">Niveau</th>
                <th className="py-1 pr-2">Cycle</th>
                <th className="py-1 pr-2">Année</th>
                <th className="py-1 pr-2">Période</th>
                <th className="py-1 pr-2">Prio</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-1.5 pr-2">{r.classe_id ? classLabel(r.classe_id) : '—'}</td>
                  <td className="py-1.5 pr-2">{r.level_code || '—'}</td>
                  <td className="py-1.5 pr-2">{r.cycle_code || '—'}</td>
                  <td className="py-1.5 pr-2">{r.annee_scolaire || '—'}</td>
                  <td className="py-1.5 pr-2">{r.periode || '—'}</td>
                  <td className="py-1.5 pr-2">{r.priority}</td>
                  <td className="py-1.5 text-right">
                    {canEdit && (
                      <button type="button" className="rounded p-1 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(r.id)} aria-label="Supprimer assignation">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
    </div>
  );
}
