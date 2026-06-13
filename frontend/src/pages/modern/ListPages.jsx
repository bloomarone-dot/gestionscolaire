import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CalendarDays, ClipboardCheck, FileText, Pencil, Plus, Search, Trash2, UserPlus, WalletCards } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, Card, DataTable, EmptyState, Input, PageHeader, Select } from '../../components/ui';

// Charge des lignes depuis le backend. Aucune donnée fictive : liste vide si rien.
function useBackendRows(loader) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await loader();
        if (active) { setRows(Array.isArray(data) ? data : []); setError(''); }
      } catch (err) {
        if (active) { setRows([]); setError(err.message || 'Erreur de chargement.'); }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loader]);

  return { rows, setRows, loading, error };
}

function Notice({ error, loading }) {
  if (loading) return <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">Chargement...</div>;
  if (error) return <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>;
  return null;
}

function rowActions({ onEdit, onDelete } = {}) {
  return (
    <div className="flex justify-end gap-2">
      {onEdit && <Button variant="ghost" className="px-2" onClick={onEdit} title="Modifier"><Pencil size={16} /></Button>}
      {onDelete && <Button variant="danger" className="px-2" onClick={onDelete} title="Supprimer"><Trash2 size={16} /></Button>}
    </div>
  );
}

function ComingSoon({ title, description, icon = Search }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState icon={icon} title="Bientot disponible" description="Cette section n'est pas encore couverte par les services. Elle arrive prochainement." />
    </>
  );
}

const mapStudent = (e) => ({
  id: e.id,
  matricule: e.matricule || `EL-${e.id}`,
  name: [e.nom, e.prenom].filter(Boolean).join(' ') || 'Eleve',
  className: e.classe_id ?? '-',
  parent: e.contact_parent || '-',
  status: e.statut || 'INSCRIT',
});

const mapTeacher = (t) => ({
  id: t.id,
  name: [t.nom, t.prenom].filter(Boolean).join(' ') || 'Enseignant',
  subjects: (t.matieres || []).join(', ') || t.specialite || '-',
  phone: t.phone || '-',
  status: t.is_active === false ? 'Inactif' : 'Actif',
});

const mapClass = (c) => ({
  id: c.id,
  name: c.nom_personnalise || c.nom || `Classe ${c.id}`,
  level: c.level_code || c.niveau_libre || '-',
  series: c.series_code || c.specialite_libre || '-',
  matieres: c.nb_matieres ?? 0,
  statut: c.statut || (c.is_special ? 'Speciale' : 'Standard'),
});

const mapMatiere = (m) => ({
  id: m.id,
  name: m.nom || m.name,
  code: m.subject_code || m.code || '-',
  coefficient: m.coefficient ?? m.coefficient_defaut ?? '-',
  groupe: m.groupe ?? '-',
});

async function confirmDelete(label) {
  return window.confirm(`Supprimer "${label}" ? Cette action est irreversible.`);
}

// ─────────────────────────────────────────────────────────── Eleves
export function StudentsPage() {
  const loader = useCallback(async () => (await api.fetchEleves_admin()).map(mapStudent), []);
  const { rows, setRows, loading, error } = useBackendRows(loader);

  async function handleDelete(row) {
    if (!(await confirmDelete(row.name))) return;
    try {
      await api.deleteEleve_admin(row.id);
      setRows((rs) => rs.filter((r) => r.id !== row.id));
    } catch (err) { alert(err.message); }
  }

  return (
    <>
      <PageHeader title="Gestion des eleves" description="Registre des eleves de l'etablissement." actions={<Button><UserPlus size={16} /> Ajouter un eleve</Button>} />
      <Notice loading={loading} error={error} />
      <DataTable
        title="Liste des eleves"
        columns={[
          { key: 'matricule', label: 'Matricule' },
          { key: 'name', label: 'Nom' },
          { key: 'className', label: 'Classe' },
          { key: 'parent', label: 'Contact parent' },
          { key: 'status', label: 'Statut', render: (r) => <Badge tone={r.status === 'INSCRIT' ? 'emerald' : 'slate'}>{r.status}</Badge> },
        ]}
        rows={rows}
        renderActions={(row) => rowActions({ onDelete: () => handleDelete(row) })}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────── Enseignants
export function TeachersPage() {
  const loader = useCallback(async () => (await api.fetchProfesseurs()).map(mapTeacher), []);
  const { rows, setRows, loading, error } = useBackendRows(loader);
  const [form, setForm] = useState({ nom: '', prenom: '', sexe: 'M', phone: '', email: '', specialite: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    try {
      const created = await api.createProfesseur(form);
      setRows((rs) => [mapTeacher(created), ...rs]);
      setForm({ nom: '', prenom: '', sexe: 'M', phone: '', email: '', specialite: '', password: '' });
      setNotice('Enseignant cree.');
    } catch (err) { setNotice(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(row) {
    if (!(await confirmDelete(row.name))) return;
    try {
      await api.deleteProfesseur(row.id);
      setRows((rs) => rs.filter((r) => r.id !== row.id));
    } catch (err) { alert(err.message); }
  }

  return (
    <>
      <PageHeader title="Gestion des enseignants" description="Enseignants, telephones et matieres." actions={<Button><Plus size={16} /> Ajouter</Button>} />
      <Notice loading={loading} error={error} />
      {notice && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}
      <DataTable
        title="Enseignants"
        columns={[
          { key: 'name', label: 'Nom' },
          { key: 'subjects', label: 'Matieres' },
          { key: 'phone', label: 'Telephone' },
          { key: 'status', label: 'Statut', render: (r) => <Badge tone={r.status === 'Actif' ? 'emerald' : 'slate'}>{r.status}</Badge> },
        ]}
        rows={rows}
        renderActions={(row) => rowActions({ onDelete: () => handleDelete(row) })}
      />
      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-bold">Creer un enseignant</h2>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
          <Input required placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          <Input placeholder="Prenom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          <Select value={form.sexe} onChange={(e) => setForm({ ...form, sexe: e.target.value })}><option value="M">Masculin</option><option value="F">Feminin</option></Select>
          <Input required placeholder="Telephone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input type="email" placeholder="Email (facultatif)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Specialite" value={form.specialite} onChange={(e) => setForm({ ...form, specialite: e.target.value })} />
          <Input required type="password" placeholder="Mot de passe" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="md:col-span-2"><Button disabled={saving}>{saving ? 'Creation...' : "Creer l'enseignant"}</Button></div>
        </form>
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────── Classes
export function ClassesPage() {
  const loader = useCallback(async () => (await api.fetchClasses()).map(mapClass), []);
  const { rows, setRows, loading, error } = useBackendRows(loader);

  async function handleDelete(row) {
    if (!(await confirmDelete(row.name))) return;
    try {
      await api.deleteClasse(row.id);
      setRows((rs) => rs.filter((r) => r.id !== row.id));
    } catch (err) { alert(err.message); }
  }

  return (
    <>
      <PageHeader title="Gestion des classes" description="Niveaux, series, effectifs et matieres." actions={<Button><Plus size={16} /> Nouvelle classe</Button>} />
      <Notice loading={loading} error={error} />
      <DataTable
        title="Classes"
        columns={[
          { key: 'name', label: 'Classe' },
          { key: 'level', label: 'Niveau' },
          { key: 'series', label: 'Serie' },
          { key: 'matieres', label: 'Matieres' },
          { key: 'statut', label: 'Statut', render: (r) => <Badge tone={r.statut === 'Standard' ? 'blue' : 'amber'}>{r.statut}</Badge> },
        ]}
        rows={rows}
        renderActions={(row) => rowActions({ onDelete: () => handleDelete(row) })}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────── Matieres
export function SubjectsPage() {
  const loader = useCallback(async () => (await api.fetchMatieres()).map(mapMatiere), []);
  const { rows, loading, error } = useBackendRows(loader);

  return (
    <>
      <PageHeader title="Matieres" description="Matieres utilisees par l'etablissement (officielles et speciales)." actions={<Button><BookOpen size={16} /> Nouvelle matiere</Button>} />
      <Notice loading={loading} error={error} />
      <DataTable
        title="Matieres"
        columns={[
          { key: 'name', label: 'Matiere' },
          { key: 'code', label: 'Code' },
          { key: 'coefficient', label: 'Coefficient' },
          { key: 'groupe', label: 'Groupe' },
        ]}
        rows={rows}
      />
    </>
  );
}

// ─────────────────────── Sections sans backend (à venir) ───────────────────────
export function SchedulesPage() {
  return <ComingSoon title="Emploi du temps" description="Planning par jour, classe, cours et salle." icon={CalendarDays} />;
}
export function AttendancePage() {
  return <ComingSoon title="Presences" description="Appel et suivi des presences par classe." icon={ClipboardCheck} />;
}
export function PaymentsPage() {
  return <ComingSoon title="Paiements" description="Frais de scolarite, recus et suivi." icon={WalletCards} />;
}
export function GradesPage() {
  return <ComingSoon title="Notes" description="Saisie des notes par classe, matiere et sequence." icon={FileText} />;
}
export function ReportsPage() {
  return <ComingSoon title="Rapports" description="Indicateurs et exports." icon={FileText} />;
}

export function ParentsPage() {
  return <ComingSoon title="Parents" description="Contacts responsables et communication famille." icon={UserPlus} />;
}
export function ExpensesPage() {
  return <ComingSoon title="Depenses" description="Charges, fournisseurs et categories." icon={WalletCards} />;
}
export function UsersPage() {
  return <ComingSoon title="Utilisateurs" description="Roles, permissions et comptes de connexion." icon={UserPlus} />;
}

export function PlaceholderPage({ title, description, icon = Search }) {
  return <ComingSoon title={title} description={description} icon={icon} />;
}
