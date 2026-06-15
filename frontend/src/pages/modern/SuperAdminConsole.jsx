import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, RefreshCw, School, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, Card, DataTable, Input, PageHeader, Select, StatCard } from '../../components/ui';

const emptySchool = {
  name: '',
  code: '',
  city: '',
  address: '',
  phone: '',
};

const emptyAdmin = {
  school_id: '',
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  password: '',
};

function normalizeSchool(school) {
  return {
    ...school,
    name: school.name || school.nom || school.label || 'Etablissement sans nom',
    code: school.code || school.slug || `SCHOOL-${school.id}`,
    city: school.city || school.ville || '-',
    status: school.is_active === false ? 'Inactif' : 'Actif',
  };
}

export default function SuperAdminConsole({ tab = 'dashboard' }) {
  const [schools, setSchools] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [schoolForm, setSchoolForm] = useState(emptySchool);
  const [adminForm, setAdminForm] = useState(emptyAdmin);
  const [loading, setLoading] = useState(true);
  const [savingSchool, setSavingSchool] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function loadSchools() {
    try {
      setLoading(true);
      setError('');
      const [schoolsData, adminsData] = await Promise.all([
        api.fetchSchools(),
        api.fetchSuperAdminAdmins().catch(() => []),
      ]);
      const normalized = Array.isArray(schoolsData) ? schoolsData.map(normalizeSchool) : [];
      setSchools(normalized);
      setAdmins(Array.isArray(adminsData) ? adminsData : []);
    } catch (err) {
      setSchools([]);
      setAdmins([]);
      setError(err.message || 'Erreur de chargement des etablissements.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchools();
  }, []);

  const stats = useMemo(() => {
    const active = schools.filter((school) => school.status === 'Actif').length;
    const inactive = schools.length - active;
    return [
      { label: 'Etablissements', value: schools.length, trend: 'Total plateforme', icon: Building2, tone: 'blue' },
      { label: 'Actifs', value: active, trend: 'En service', icon: CheckCircle2, tone: 'emerald' },
      { label: 'Inactifs', value: inactive, trend: inactive ? 'A reactiver' : 'Aucun', icon: ShieldCheck, tone: 'slate' },
    ];
  }, [schools]);

  const PAGE_TITLES = {
    dashboard: 'Vue plateforme',
    schools: 'Etablissements',
    admins: 'Comptes administrateurs',
    settings: 'Parametres plateforme',
  };

  async function handleCreateSchool(event) {
    event.preventDefault();
    setSavingSchool(true);
    setNotice('');
    setError('');
    try {
      const created = await api.createSchool({
        ...schoolForm,
        subsystems: ['FRANCOPHONE'],
        teaching_types: ['GENERAL'],
        channels: ['INTERNAL'],
      });
      const next = normalizeSchool(created);
      setSchools((current) => [next, ...current.filter((school) => school.id !== next.id)]);
      setAdminForm((current) => ({ ...current, school_id: String(next.id || '') }));
      setSchoolForm(emptySchool);
      setNotice("Etablissement cree. Vous pouvez maintenant creer l'admin rattache.");
    } catch (err) {
      setError(err.message || "Impossible de creer l'etablissement.");
    } finally {
      setSavingSchool(false);
    }
  }

  async function handleCreateAdmin(event) {
    event.preventDefault();
    setSavingAdmin(true);
    setNotice('');
    setError('');
    try {
      await api.createSchoolAdmin(adminForm.school_id, {
        first_name: adminForm.first_name,
        last_name: adminForm.last_name,
        phone: adminForm.phone,
        email: adminForm.email || null,
        password: adminForm.password,
      });
      const schoolName = schools.find((school) => String(school.id) === String(adminForm.school_id))?.name || '-';
      setAdmins((current) => [{
        id: Date.now(),
        name: [adminForm.first_name, adminForm.last_name].filter(Boolean).join(' '),
        phone: adminForm.phone,
        school: schoolName,
        status: 'Actif',
      }, ...current]);
      setAdminForm(emptyAdmin);
      setNotice("Compte admin cree et rattache a l'etablissement.");
    } catch (err) {
      setError(err.message || "Impossible de creer l'admin.");
    } finally {
      setSavingAdmin(false);
    }
  }

  async function handleDeleteSchool(row) {
    if (!window.confirm(`Supprimer l'etablissement "${row.name}" ? Action irreversible.`)) return;
    setError('');
    try {
      await api.deleteSchool(row.id);
      setSchools((current) => current.filter((s) => s.id !== row.id));
      setNotice('Etablissement supprime.');
    } catch (err) {
      setError(err.message || "Suppression impossible.");
    }
  }

  const showDashboard = tab === 'dashboard';
  const showSchools = tab === 'dashboard' || tab === 'schools';
  const showAdmins = tab === 'dashboard' || tab === 'admins';

  return (
    <>
      <PageHeader
        breadcrumb="Plateforme / Superadmin"
        title={PAGE_TITLES[tab] || 'Plateforme'}
        actions={<Button variant="secondary" onClick={loadSchools} disabled={loading}><RefreshCw size={16} /> Actualiser</Button>}
      />

      {notice && <div className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}
      {error && <div className="mb-5 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">{error}</div>}

      {showDashboard && (
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          {stats.map((item) => <StatCard key={item.label} {...item} />)}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {showSchools && (
          <Card className="p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Nouvel etablissement</h2>
                <p className="mt-1 text-sm text-slate-500">Le superadmin cree l'espace ecole avant de creer son administrateur.</p>
              </div>
              <span className="rounded-xl bg-blue-50 p-3 text-blue-700 ring-1 ring-blue-200"><School size={20} /></span>
            </div>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateSchool}>
              <Input required placeholder="Nom de l'etablissement" value={schoolForm.name} onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })} />
              <Input required placeholder="Code court" value={schoolForm.code} onChange={(e) => setSchoolForm({ ...schoolForm, code: e.target.value })} />
              <Input placeholder="Ville" value={schoolForm.city} onChange={(e) => setSchoolForm({ ...schoolForm, city: e.target.value })} />
              <Input placeholder="Telephone" value={schoolForm.phone} onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })} />
              <Input className="md:col-span-2" placeholder="Adresse" value={schoolForm.address} onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })} />
              <div className="md:col-span-2">
                <Button disabled={savingSchool}>{savingSchool ? 'Creation...' : "Creer l'etablissement"}</Button>
              </div>
            </form>
          </Card>
        )}

        {showAdmins && (
          <Card className="p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Admin d'etablissement</h2>
                <p className="mt-1 text-sm text-slate-500">Ce compte aura acces au dashboard ecole et pourra creer les enseignants.</p>
              </div>
              <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700 ring-1 ring-emerald-200"><UserPlus size={20} /></span>
            </div>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateAdmin}>
              <Select required value={adminForm.school_id} onChange={(e) => setAdminForm({ ...adminForm, school_id: e.target.value })}>
                <option value="">Selectionner l'etablissement</option>
                {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
              </Select>
              <Input required placeholder="Telephone de connexion" value={adminForm.phone} onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })} />
              <Input required placeholder="Prenom" value={adminForm.first_name} onChange={(e) => setAdminForm({ ...adminForm, first_name: e.target.value })} />
              <Input required placeholder="Nom" value={adminForm.last_name} onChange={(e) => setAdminForm({ ...adminForm, last_name: e.target.value })} />
              <Input type="email" placeholder="Email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} />
              <Input required type="password" placeholder="Mot de passe initial" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} />
              <div className="md:col-span-2">
                <Button disabled={savingAdmin || !schools.length}>{savingAdmin ? 'Creation...' : "Creer l'admin"}</Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      {tab === 'settings' && (
        <Card className="p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Configuration globale</h2>
              <p className="mt-1 text-sm text-slate-500">Parametres communs a la plateforme multi-etablissements.</p>
            </div>
            <span className="rounded-xl bg-slate-100 p-3 text-slate-700 ring-1 ring-slate-200"><ShieldCheck size={20} /></span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input defaultValue="EduGestion" placeholder="Nom plateforme" />
            <Select defaultValue="active"><option value="active">Inscriptions actives</option><option value="closed">Inscriptions fermees</option></Select>
            <Input defaultValue="Afrique/Douala" placeholder="Fuseau horaire" />
            <Input defaultValue="XAF" placeholder="Devise par defaut" />
          </div>
          <Button className="mt-5">Enregistrer</Button>
        </Card>
      )}

      {tab === 'admins' && (
        <div className="mt-6">
          <DataTable
            title="Admins d'etablissement"
            description="Comptes rattaches aux etablissements."
            columns={[
              { key: 'name', label: 'Admin' },
              { key: 'phone', label: 'Telephone' },
              { key: 'school', label: 'Etablissement' },
              { key: 'status', label: 'Statut', render: (row) => <Badge tone="emerald">{row.status}</Badge> },
            ]}
            rows={admins}
          />
        </div>
      )}

      {showSchools && (
        <div className="mt-6">
          <DataTable
            title="Etablissements"
            description={loading ? 'Chargement depuis le backend...' : 'Liste synchronisee avec le service tenants.'}
            columns={[
              { key: 'name', label: 'Etablissement' },
              { key: 'code', label: 'Code' },
              { key: 'city', label: 'Ville' },
              { key: 'status', label: 'Statut', render: (row) => <Badge tone={row.status === 'Actif' ? 'emerald' : 'rose'}>{row.status}</Badge> },
            ]}
            rows={schools}
            renderActions={(row) => (
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setAdminForm((current) => ({ ...current, school_id: String(row.id) }))}><CheckCircle2 size={16} /> Choisir</Button>
                <Button variant="danger" className="px-2" title="Supprimer" onClick={() => handleDeleteSchool(row)}><Trash2 size={16} /></Button>
              </div>
            )}
          />
        </div>
      )}
    </>
  );
}
