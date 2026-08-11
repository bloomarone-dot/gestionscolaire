import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, DoorOpen, Plus, Trash2 } from 'lucide-react';
import * as api from '../../api/api';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import {
  Badge, Button, Card, DataTable, Input, Modal, PageHeader, Select,
} from '../../components/ui';

const JOURS = [
  { value: 0, label: 'Lundi' },
  { value: 1, label: 'Mardi' },
  { value: 2, label: 'Mercredi' },
  { value: 3, label: 'Jeudi' },
  { value: 4, label: 'Vendredi' },
  { value: 5, label: 'Samedi' },
];

const VISIBLE_DAYS = [0, 1, 2, 3, 4, 5];

function formatTime(value) {
  if (!value) return '—';
  const s = String(value);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function classLabel(classe) {
  return classe?.nom || classe?.nom_personnalise || classe?.name || `Classe ${classe?.id}`;
}

function teacherLabel(t) {
  return [t.prenom, t.nom].filter(Boolean).join(' ') || t.nom_complet || `Formateur ${t.id}`;
}

const emptySalle = { nom: '', capacite: '', etage: '', notes: '' };
const emptySeance = {
  jour_semaine: '0',
  heure_debut: '08:00',
  heure_fin: '10:00',
  classe_id: '',
  salle_id: '',
  enseignant_id: '',
  matiere_label: '',
  notes: '',
};

export default function SchedulesPage() {
  const { labels: ui, isLanguageCenter } = useEstablishmentProfile();
  const [salles, setSalles] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [week, setWeek] = useState({});
  const [filterClasse, setFilterClasse] = useState('');
  const [filterSalle, setFilterSalle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [salleModal, setSalleModal] = useState(false);
  const [seanceModal, setSeanceModal] = useState(false);
  const [salleForm, setSalleForm] = useState(emptySalle);
  const [seanceForm, setSeanceForm] = useState(emptySeance);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterClasse) params.classe_id = filterClasse;
      if (filterSalle) params.salle_id = filterSalle;
      const [s, c, t, w] = await Promise.all([
        api.fetchSalles().catch(() => []),
        api.fetchClasses().catch(() => []),
        api.fetchProfesseurs().catch(() => []),
        api.fetchPlanningSemaine(params).catch(() => ({ jours: {} })),
      ]);
      setSalles(Array.isArray(s) ? s : []);
      setClasses(Array.isArray(c) ? c : []);
      setTeachers(Array.isArray(t) ? t : []);
      setWeek(w?.jours || {});
    } catch (err) {
      setError(err.message || 'Impossible de charger le planning.');
    } finally {
      setLoading(false);
    }
  }, [filterClasse, filterSalle]);

  useEffect(() => { load(); }, [load]);

  const salleRows = useMemo(() => salles.map((s) => ({
    ...s,
    capacite_label: s.capacite ? `${s.capacite} places` : '—',
    status: s.is_active === false ? 'Inactive' : 'Active',
  })), [salles]);

  async function handleCreateSalle(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createSalle({
        nom: salleForm.nom.trim(),
        capacite: salleForm.capacite ? Number(salleForm.capacite) : null,
        etage: salleForm.etage || null,
        notes: salleForm.notes || null,
      });
      setSalleModal(false);
      setSalleForm(emptySalle);
      setNotice('Salle ajoutée.');
      await load();
    } catch (err) {
      setError(err.message || 'Création impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSalle(id) {
    if (!window.confirm('Supprimer cette salle ?')) return;
    try {
      await api.deleteSalle(id);
      setNotice('Salle supprimée.');
      await load();
    } catch (err) {
      setError(err.message || 'Suppression impossible.');
    }
  }

  async function handleCreateSeance(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const classe = classes.find((c) => String(c.id) === String(seanceForm.classe_id));
    const salle = salles.find((s) => String(s.id) === String(seanceForm.salle_id));
    const teacher = teachers.find((t) => String(t.id) === String(seanceForm.enseignant_id));
    try {
      await api.createSeance({
        jour_semaine: Number(seanceForm.jour_semaine),
        heure_debut: seanceForm.heure_debut,
        heure_fin: seanceForm.heure_fin,
        classe_id: classe?.id ?? null,
        classe_nom: classe ? classLabel(classe) : null,
        salle_id: salle?.id ?? null,
        salle_nom: salle?.nom ?? null,
        enseignant_id: teacher?.id ?? null,
        enseignant_nom: teacher ? teacherLabel(teacher) : null,
        matiere_label: seanceForm.matiere_label || null,
        notes: seanceForm.notes || null,
      });
      setSeanceModal(false);
      setSeanceForm(emptySeance);
      setNotice('Créneau ajouté au planning.');
      await load();
    } catch (err) {
      setError(err.message || 'Création impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSeance(id) {
    if (!window.confirm('Supprimer ce créneau ?')) return;
    try {
      await api.deleteSeance(id);
      setNotice('Créneau supprimé.');
      await load();
    } catch (err) {
      setError(err.message || 'Suppression impossible.');
    }
  }

  const title = isLanguageCenter ? 'Planning & salles' : 'Emploi du temps';

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={`Organisation des créneaux par ${ui.classes.toLowerCase()}, formateur et salle.`}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => { setSalleForm(emptySalle); setSalleModal(true); }}>
              <DoorOpen size={16} /> Nouvelle salle
            </Button>
            <Button onClick={() => { setSeanceForm(emptySeance); setSeanceModal(true); }}>
              <Plus size={16} /> Nouveau créneau
            </Button>
          </div>
        )}
      />

      {notice && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Filtrer par {ui.class.toLowerCase()}</label>
            <Select value={filterClasse} onChange={(e) => setFilterClasse(e.target.value)}>
              <option value="">Toutes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Filtrer par salle</label>
            <Select value={filterSalle} onChange={(e) => setFilterSalle(e.target.value)}>
              <option value="">Toutes</option>
              {salles.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </Select>
          </div>
        </div>
      </Card>

      {loading ? (
        <p className="text-sm text-slate-500">Chargement du planning…</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {VISIBLE_DAYS.map((day) => {
            const sessions = week[String(day)] || week[day] || [];
            const label = JOURS.find((j) => j.value === day)?.label;
            return (
              <Card key={day} className="p-3">
                <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <CalendarDays size={16} className="text-violet-600" />
                  <h3 className="text-sm font-bold text-slate-800">{label}</h3>
                  <Badge tone="slate">{sessions.length}</Badge>
                </div>
                {sessions.length === 0 ? (
                  <p className="text-xs text-slate-400">Aucun créneau</p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((s) => (
                      <div key={s.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs">
                        <p className="font-semibold text-slate-800">
                          {formatTime(s.heure_debut)} – {formatTime(s.heure_fin)}
                        </p>
                        <p className="mt-1 text-slate-600">{s.classe_nom || s.matiere_label || '—'}</p>
                        {s.salle_nom && <p className="text-slate-500">Salle : {s.salle_nom}</p>}
                        {s.enseignant_nom && <p className="text-slate-500">{s.enseignant_nom}</p>}
                        <button
                          type="button"
                          className="mt-2 inline-flex items-center gap-1 text-rose-600 hover:underline"
                          onClick={() => handleDeleteSeance(s.id)}
                        >
                          <Trash2 size={12} /> Supprimer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <DataTable
        title="Salles"
        description="Locaux disponibles pour les cours et sessions."
        columns={[
          { key: 'nom', label: 'Nom' },
          { key: 'capacite_label', label: 'Capacité' },
          { key: 'etage', label: 'Étage' },
          {
            key: 'status',
            label: 'Statut',
            render: (row) => <Badge tone={row.status === 'Active' ? 'emerald' : 'slate'}>{row.status}</Badge>,
          },
        ]}
        rows={loading ? [] : salleRows}
        emptyMessage={loading ? 'Chargement…' : 'Aucune salle — ajoutez-en une pour commencer.'}
        renderActions={(row) => (
          <Button variant="ghost" className="px-2 py-1 text-xs text-rose-600" onClick={() => handleDeleteSalle(row.id)}>
            <Trash2 size={14} />
          </Button>
        )}
      />

      <Modal
        title="Nouvelle salle"
        open={salleModal}
        onClose={() => setSalleModal(false)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSalleModal(false)}>Annuler</Button>
            <Button onClick={handleCreateSalle} disabled={saving}>{saving ? 'Enregistrement…' : 'Créer'}</Button>
          </div>
        )}
      >
        <form className="space-y-3" onSubmit={handleCreateSalle}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Nom *</label>
            <Input value={salleForm.nom} onChange={(e) => setSalleForm((f) => ({ ...f, nom: e.target.value }))} required placeholder="Salle A1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Capacité</label>
              <Input type="number" min="1" value={salleForm.capacite} onChange={(e) => setSalleForm((f) => ({ ...f, capacite: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Étage</label>
              <Input value={salleForm.etage} onChange={(e) => setSalleForm((f) => ({ ...f, etage: e.target.value }))} placeholder="RDC, 1er…" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Notes</label>
            <Input value={salleForm.notes} onChange={(e) => setSalleForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </form>
      </Modal>

      <Modal
        title="Nouveau créneau"
        open={seanceModal}
        onClose={() => setSeanceModal(false)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSeanceModal(false)}>Annuler</Button>
            <Button onClick={handleCreateSeance} disabled={saving}>{saving ? 'Enregistrement…' : 'Ajouter'}</Button>
          </div>
        )}
      >
        <form className="space-y-3" onSubmit={handleCreateSeance}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Jour *</label>
              <Select value={seanceForm.jour_semaine} onChange={(e) => setSeanceForm((f) => ({ ...f, jour_semaine: e.target.value }))}>
                {JOURS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{ui.class}</label>
              <Select value={seanceForm.classe_id} onChange={(e) => setSeanceForm((f) => ({ ...f, classe_id: e.target.value }))}>
                <option value="">— Optionnel —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Début *</label>
              <Input type="time" value={seanceForm.heure_debut} onChange={(e) => setSeanceForm((f) => ({ ...f, heure_debut: e.target.value }))} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Fin *</label>
              <Input type="time" value={seanceForm.heure_fin} onChange={(e) => setSeanceForm((f) => ({ ...f, heure_fin: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Salle</label>
              <Select value={seanceForm.salle_id} onChange={(e) => setSeanceForm((f) => ({ ...f, salle_id: e.target.value }))}>
                <option value="">— Aucune —</option>
                {salles.filter((s) => s.is_active !== false).map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{ui.teachers.replace(/s$/, '')}</label>
              <Select value={seanceForm.enseignant_id} onChange={(e) => setSeanceForm((f) => ({ ...f, enseignant_id: e.target.value }))}>
                <option value="">— Optionnel —</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{teacherLabel(t)}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Matière / module</label>
            <Input value={seanceForm.matiere_label} onChange={(e) => setSeanceForm((f) => ({ ...f, matiere_label: e.target.value }))} placeholder="Allemand A1, Conversation…" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
