import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CalendarDays, CheckCircle2, Download, Eye, FileText, Pencil, Plus, Search, Trash2, UserPlus, WalletCards } from 'lucide-react';
import * as api from '../../api/api';
import { attendance, classes, grades, payments, schedule, students, teachers } from '../../data/mockSchool';
import { Badge, Button, Card, DataTable, EmptyState, Input, PageHeader, Select, Textarea } from '../../components/ui';

function useBackendRows(loader, fallbackRows) {
  const [rows, setRows] = useState(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const data = await loader();
        if (active) {
          setRows(Array.isArray(data) && data.length ? data : fallbackRows);
          setError('');
        }
      } catch (err) {
        if (active) {
          setRows(fallbackRows);
          setError(err.message || 'Backend indisponible.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [fallbackRows, loader]);

  return { rows, setRows, loading, error };
}

function Notice({ error, loading }) {
  if (loading) return <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">Synchronisation avec le backend...</div>;
  if (error) return <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">Backend indisponible: donnees demo affichees. {error}</div>;
  return null;
}

function mapStudent(eleve) {
  return {
    id: eleve.id,
    matricule: eleve.matricule || eleve.registration_number || `EL-${eleve.id}`,
    name: [eleve.nom, eleve.prenom].filter(Boolean).join(' ') || eleve.name || 'Eleve',
    className: eleve.classe_nom || eleve.className || eleve.classe_id || '-',
    parent: eleve.parent_nom || eleve.parent || '-',
    status: eleve.is_active === false ? 'Inactif' : 'Actif',
    payment: eleve.payment || eleve.payment_status || 'A jour',
  };
}

function mapTeacher(teacher) {
  return {
    id: teacher.id,
    name: [teacher.nom, teacher.prenom].filter(Boolean).join(' ') || teacher.name || teacher.username || 'Enseignant',
    subjects: teacher.specialite || teacher.subjects || '-',
    classes: teacher.classes || '-',
    phone: teacher.phone || teacher.telephone || '-',
    status: teacher.is_active === false ? 'Inactif' : 'Actif',
  };
}

function mapClass(classe) {
  return {
    id: classe.id,
    name: classe.nom || classe.nom_personnalise || classe.name || 'Classe',
    level: classe.niveau || classe.level || classe.section || '-',
    students: classe.effectif || classe.students || 0,
    mainTeacher: classe.professeur_principal || classe.mainTeacher || '-',
  };
}

const actions = (view = true) => (
  <div className="flex justify-end gap-2">
    {view && <Button variant="ghost" className="px-2"><Eye size={16} /></Button>}
    <Button variant="ghost" className="px-2"><Pencil size={16} /></Button>
    <Button variant="danger" className="px-2"><Trash2 size={16} /></Button>
  </div>
);

function filters(placeholder = 'Rechercher...') {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <div className="md:col-span-2"><Input placeholder={placeholder} /></div>
      <Select><option>Toutes les classes</option><option>Terminale C</option><option>Premiere D</option></Select>
      <Select><option>Tous les statuts</option><option>Actif</option><option>Inactif</option></Select>
    </div>
  );
}

const parents = [
  { id: 1, name: 'Mballa Joseph', children: 'Mballa Grace', phone: '699 112 233', relation: 'Pere', status: 'Actif' },
  { id: 2, name: 'Nana Carine', children: 'Nana Patrick', phone: '677 908 145', relation: 'Mere', status: 'Actif' },
  { id: 3, name: 'Talla Marc', children: 'Talla Ingrid', phone: '655 400 298', relation: 'Tuteur', status: 'Actif' },
];

const subjects = [
  { id: 1, name: 'Mathematiques', code: 'MATH', coefficient: 5, classes: 'Tle C, 1ere D', teacher: 'Dr. Assomo Diane' },
  { id: 2, name: 'Physique', code: 'PHY', coefficient: 4, classes: 'Tle D, 2nde C', teacher: 'M. Ekani Paul' },
  { id: 3, name: 'Francais', code: 'FR', coefficient: 4, classes: '3eme A, 4eme B', teacher: 'Mme Ngo Biloa' },
];

const bulletins = [
  { id: 1, className: 'Terminale C', period: 'Trimestre 2', generated: 34, pending: 4, status: 'Pret' },
  { id: 2, className: 'Premiere D', period: 'Trimestre 2', generated: 38, pending: 6, status: 'En cours' },
  { id: 3, className: '3eme A', period: 'Trimestre 2', generated: 49, pending: 3, status: 'Pret' },
];

const expenses = [
  { id: 1, label: 'Salaires enseignants', category: 'Personnel', amount: '4 250 000 XAF', date: '2026-06-05', status: 'Payee' },
  { id: 2, label: 'Maintenance salles', category: 'Infrastructure', amount: '380 000 XAF', date: '2026-06-08', status: 'Validee' },
  { id: 3, label: 'Fournitures bureau', category: 'Administration', amount: '125 000 XAF', date: '2026-06-10', status: 'En attente' },
];

const users = [
  { id: 1, name: 'VOGT VOGT', role: 'Admin', phone: '699 000 111', scope: 'Etablissement', status: 'Actif' },
  { id: 2, name: 'Dr. Assomo Diane', role: 'Enseignant', phone: '699 112 233', scope: 'Terminale C', status: 'Actif' },
  { id: 3, name: 'Comptable Ecole', role: 'Finance', phone: '677 000 333', scope: 'Paiements', status: 'Actif' },
];

export function ParentsPage() {
  return (
    <>
      <PageHeader title="Parents" description="Contacts responsables, enfants associes et communication famille." actions={<Button><UserPlus size={16} /> Ajouter un parent</Button>} />
      <DataTable
        title="Contacts parents"
        filters={filters('Nom, telephone, enfant...')}
        columns={[
          { key: 'name', label: 'Parent' },
          { key: 'children', label: 'Enfants' },
          { key: 'relation', label: 'Lien' },
          { key: 'phone', label: 'Telephone' },
          { key: 'status', label: 'Statut', render: (row) => <Badge tone="emerald">{row.status}</Badge> },
        ]}
        rows={parents}
        renderActions={() => actions()}
      />
      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-bold">Nouveau contact parent</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Nom complet" />
          <Input placeholder="Telephone" />
          <Select><option>Lien familial</option><option>Pere</option><option>Mere</option><option>Tuteur</option></Select>
          <Input placeholder="Eleve associe" />
        </div>
      </Card>
    </>
  );
}

export function StudentsPage() {
  const loadStudents = useCallback(async () => (await api.fetchEleves_admin()).map(mapStudent), []);
  const { rows, loading, error } = useBackendRows(
    loadStudents,
    students,
  );

  return (
    <>
      <PageHeader title="Gestion des eleves" description="Recherche, filtres, statuts, classes et actions rapides." actions={<Button><UserPlus size={16} /> Ajouter un eleve</Button>} />
      <Notice loading={loading} error={error} />
      <DataTable
        title="Liste des eleves"
        description="Registre actif de l'etablissement."
        filters={filters('Nom, matricule, parent...')}
        columns={[
          { key: 'matricule', label: 'Matricule' },
          { key: 'name', label: 'Nom' },
          { key: 'className', label: 'Classe' },
          { key: 'parent', label: 'Parent' },
          { key: 'status', label: 'Statut', render: (r) => <Badge tone={r.status === 'Actif' ? 'emerald' : 'rose'}>{r.status}</Badge> },
          { key: 'payment', label: 'Paiement', render: (r) => <Badge tone={r.payment === 'A jour' ? 'emerald' : r.payment === 'Partiel' ? 'amber' : 'rose'}>{r.payment}</Badge> },
        ]}
        rows={rows}
        renderActions={() => actions()}
      />
      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-bold">Formulaire eleve</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Nom complet" />
          <Input placeholder="Matricule" />
          <Select><option>Classe</option>{classes.map((c) => <option key={c.id}>{c.name}</option>)}</Select>
          <Input placeholder="Telephone parent" />
        </div>
      </Card>
    </>
  );
}

export function TeachersPage() {
  const loadTeachers = useCallback(async () => (await api.fetchProfesseurs()).map(mapTeacher), []);
  const { rows, setRows, loading, error } = useBackendRows(
    loadTeachers,
    teachers,
  );
  const [form, setForm] = useState({ nom: '', prenom: '', phone: '', email: '', specialite: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  async function handleCreateTeacher(event) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    try {
      const created = await api.createProfesseur(form);
      setRows((current) => [mapTeacher(created), ...current]);
      setForm({ nom: '', prenom: '', phone: '', email: '', specialite: '', password: '' });
      setNotice('Enseignant cree avec succes.');
    } catch (err) {
      setNotice(err.message || "Impossible de creer l'enseignant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Gestion des enseignants" description="Suivi des enseignants, matieres associees et classes affectees." actions={<Button><Plus size={16} /> Ajouter</Button>} />
      <Notice loading={loading} error={error} />
      {notice && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}
      <DataTable
        title="Enseignants"
        filters={filters('Nom, matiere, telephone...')}
        columns={[
          { key: 'name', label: 'Nom' },
          { key: 'subjects', label: 'Matieres' },
          { key: 'classes', label: 'Classes' },
          { key: 'phone', label: 'Telephone' },
          { key: 'status', label: 'Statut', render: (r) => <Badge tone="emerald">{r.status}</Badge> },
        ]}
        rows={rows}
        renderActions={() => actions()}
      />
      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-bold">Creer un enseignant</h2>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateTeacher}>
          <Input required placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          <Input required placeholder="Prenom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          <Input required placeholder="Telephone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Specialite / matiere" value={form.specialite} onChange={(e) => setForm({ ...form, specialite: e.target.value })} />
          <Input type="password" placeholder="Mot de passe initial" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="md:col-span-2">
            <Button disabled={saving}>{saving ? 'Creation...' : "Creer l'enseignant"}</Button>
          </div>
        </form>
      </Card>
    </>
  );
}

export function ClassesPage() {
  const loadClasses = useCallback(async () => (await api.fetchClasses()).map(mapClass), []);
  const { rows, loading, error } = useBackendRows(
    loadClasses,
    classes,
  );

  return (
    <>
      <PageHeader title="Gestion des classes" description="Niveaux, effectifs, professeurs principaux et actions." actions={<Button><Plus size={16} /> Nouvelle classe</Button>} />
      <Notice loading={loading} error={error} />
      <DataTable
        title="Classes"
        columns={[
          { key: 'name', label: 'Classe' },
          { key: 'level', label: 'Niveau' },
          { key: 'students', label: 'Effectif' },
          { key: 'mainTeacher', label: 'Professeur principal' },
        ]}
        rows={rows}
        renderActions={() => actions(false)}
      />
    </>
  );
}

export function SchedulesPage() {
  return (
    <>
      <PageHeader title="Emploi du temps" description="Vue claire par jour, classe, cours, enseignant et salle." actions={<Button><CalendarDays size={16} /> Planifier</Button>} />
      <DataTable
        title="Semaine courante"
        filters={<div className="grid gap-3 md:grid-cols-3"><Select><option>Semaine actuelle</option></Select><Select><option>Toutes les classes</option></Select><Select><option>Tous les enseignants</option></Select></div>}
        columns={[
          { key: 'day', label: 'Jour' },
          { key: 'time', label: 'Horaire' },
          { key: 'course', label: 'Cours' },
          { key: 'teacher', label: 'Enseignant' },
          { key: 'room', label: 'Salle' },
          { key: 'className', label: 'Classe' },
        ]}
        rows={schedule.map((r, id) => ({ ...r, id }))}
      />
    </>
  );
}

export function AttendancePage() {
  return (
    <>
      <PageHeader title="Presences" description="Interface d'appel et resume visuel par classe/date." actions={<Button><CheckCircle2 size={16} /> Valider l'appel</Button>} />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {attendance.map((item) => (
          <Card key={item.className} className="p-5">
            <h2 className="font-bold">{item.className}</h2>
            <p className="mt-1 text-sm text-slate-500">Taux de presence: {item.rate}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">{item.present} presents</span>
              <span className="rounded-lg bg-rose-50 p-2 text-rose-700">{item.absent} absents</span>
              <span className="rounded-lg bg-amber-50 p-2 text-amber-700">{item.late} retards</span>
            </div>
          </Card>
        ))}
      </div>
      <DataTable title="Feuille d'appel" filters={filters('Rechercher un eleve...')} columns={[
        { key: 'name', label: 'Eleve' },
        { key: 'className', label: 'Classe' },
        { key: 'status', label: 'Presence', render: () => <Select><option>Present</option><option>Absent</option><option>Retard</option></Select> },
      ]} rows={students} />
    </>
  );
}

export function GradesPage() {
  return (
    <>
      <PageHeader title="Notes et bulletins" description="Saisie des notes, moyennes, appreciations et generation de bulletins." actions={<Button><FileText size={16} /> Generer bulletins</Button>} />
      <DataTable title="Saisie des notes" filters={filters('Eleve, matiere...')} columns={[
        { key: 'student', label: 'Eleve' },
        { key: 'className', label: 'Classe' },
        { key: 'subject', label: 'Matiere' },
        { key: 'score', label: 'Note' },
        { key: 'average', label: 'Moyenne' },
        { key: 'appreciation', label: 'Appreciation' },
      ]} rows={grades.map((r, id) => ({ ...r, id }))} renderActions={() => actions(false)} />
    </>
  );
}

export function PaymentsPage() {
  return (
    <>
      <PageHeader title="Paiements" description="Frais de scolarite, statuts, recus et suivi par periode." actions={<Button><WalletCards size={16} /> Nouveau paiement</Button>} />
      <DataTable title="Paiements recents" filters={filters('Eleve, recu, montant...')} columns={[
        { key: 'student', label: 'Eleve' },
        { key: 'className', label: 'Classe' },
        { key: 'amount', label: 'Montant' },
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Statut', render: (r) => <Badge tone={r.status === 'Payé' ? 'emerald' : r.status === 'Partiel' ? 'amber' : 'rose'}>{r.status}</Badge> },
      ]} rows={payments.map((r, id) => ({ ...r, id }))} renderActions={() => <Button variant="secondary"><Download size={16} /> Recu</Button>} />
    </>
  );
}

export function BulletinsPage() {
  return (
    <>
      <PageHeader title="Bulletins" description="Generation, apercu et publication des bulletins par classe." actions={<Button><FileText size={16} /> Generer</Button>} />
      <DataTable title="Sessions de bulletins" filters={<div className="grid gap-3 md:grid-cols-3"><Select><option>Trimestre 2</option><option>Trimestre 1</option></Select><Select><option>Toutes les classes</option></Select><Select><option>Tous les statuts</option></Select></div>} columns={[
        { key: 'className', label: 'Classe' },
        { key: 'period', label: 'Periode' },
        { key: 'generated', label: 'Generes' },
        { key: 'pending', label: 'Restants' },
        { key: 'status', label: 'Statut', render: (row) => <Badge tone={row.status === 'Pret' ? 'emerald' : 'amber'}>{row.status}</Badge> },
      ]} rows={bulletins} renderActions={() => <Button variant="secondary"><Eye size={16} /> Apercu</Button>} />
    </>
  );
}

export function ExpensesPage() {
  return (
    <>
      <PageHeader title="Depenses" description="Suivi des charges, fournisseurs et categories de l'etablissement." actions={<Button><WalletCards size={16} /> Nouvelle depense</Button>} />
      <DataTable title="Depenses recentes" filters={filters('Libelle, categorie, montant...')} columns={[
        { key: 'label', label: 'Libelle' },
        { key: 'category', label: 'Categorie' },
        { key: 'amount', label: 'Montant' },
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Statut', render: (row) => <Badge tone={row.status === 'Payee' ? 'emerald' : row.status === 'Validee' ? 'blue' : 'amber'}>{row.status}</Badge> },
      ]} rows={expenses} renderActions={() => actions(false)} />
      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-bold">Enregistrer une depense</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Libelle" />
          <Select><option>Categorie</option><option>Personnel</option><option>Infrastructure</option><option>Administration</option></Select>
          <Input placeholder="Montant" />
          <Input type="date" />
        </div>
      </Card>
    </>
  );
}

export function ReportsPage() {
  return (
    <>
      <PageHeader title="Rapports" description="Indicateurs financiers et scolaires avec exports prepares." actions={<Button><Download size={16} /> Exporter</Button>} />
      <div className="grid gap-4 md:grid-cols-3">
        {['Rapport financier', 'Rapport pedagogique', 'Rapport absences'].map((title) => (
          <Card key={title} className="p-5">
            <h2 className="font-bold">{title}</h2>
            <p className="mt-2 text-sm text-slate-500">Filtres par periode, classe et statut.</p>
            <Button variant="secondary" className="mt-4"><Download size={16} /> Preparer</Button>
          </Card>
        ))}
      </div>
    </>
  );
}

export function UsersPage() {
  return (
    <>
      <PageHeader title="Utilisateurs" description="Roles, permissions et comptes de connexion de l'etablissement." actions={<Button><UserPlus size={16} /> Nouvel utilisateur</Button>} />
      <DataTable title="Comptes actifs" filters={filters('Nom, role, telephone...')} columns={[
        { key: 'name', label: 'Utilisateur' },
        { key: 'role', label: 'Role', render: (row) => <Badge tone={row.role === 'Admin' ? 'blue' : row.role === 'Finance' ? 'amber' : 'emerald'}>{row.role}</Badge> },
        { key: 'phone', label: 'Telephone' },
        { key: 'scope', label: 'Perimetre' },
        { key: 'status', label: 'Statut', render: (row) => <Badge tone="emerald">{row.status}</Badge> },
      ]} rows={users} renderActions={() => actions()} />
      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-bold">Creer un compte</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Nom complet" />
          <Input placeholder="Telephone" />
          <Select><option>Role</option><option>Admin</option><option>Enseignant</option><option>Finance</option></Select>
          <Input type="password" placeholder="Mot de passe initial" />
        </div>
      </Card>
    </>
  );
}

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Parametres" description="Etablissement, annee scolaire, roles, permissions et frais." />
      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Nom de l'etablissement" defaultValue="Complexe Scolaire Bloomar" />
          <Input placeholder="Annee scolaire" defaultValue="2025-2026" />
          <Input placeholder="Telephone" />
          <Input placeholder="Email" />
          <Textarea className="md:col-span-2" placeholder="Adresse complete" />
        </div>
        <Button className="mt-5">Enregistrer</Button>
      </Card>
    </>
  );
}

export function PlaceholderPage({ title, description, icon = Search }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState icon={icon} title={`${title} en preparation`} description="L'interface est prete dans le layout SaaS et pourra etre branchee aux services API." />
    </>
  );
}

export function SubjectsPage() {
  return (
    <>
      <PageHeader title="Matieres" description="Catalogue des matieres, coefficients et affectations." actions={<Button><BookOpen size={16} /> Nouvelle matiere</Button>} />
      <DataTable title="Matieres enseignees" filters={filters('Matiere, code, enseignant...')} columns={[
        { key: 'name', label: 'Matiere' },
        { key: 'code', label: 'Code' },
        { key: 'coefficient', label: 'Coefficient' },
        { key: 'classes', label: 'Classes' },
        { key: 'teacher', label: 'Enseignant' },
      ]} rows={subjects} renderActions={() => actions(false)} />
      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-bold">Affecter une matiere</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Input placeholder="Nom de la matiere" />
          <Input placeholder="Code" />
          <Input placeholder="Coefficient" />
          <Select><option>Classe</option><option>Terminale C</option><option>Premiere D</option></Select>
          <Select><option>Enseignant</option>{teachers.map((teacher) => <option key={teacher.id}>{teacher.name}</option>)}</Select>
          <Button>Enregistrer</Button>
        </div>
      </Card>
    </>
  );
}
