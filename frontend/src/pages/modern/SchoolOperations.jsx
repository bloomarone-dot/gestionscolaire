import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Download, Eye, FileText, GraduationCap, Plus, School, Trash2, UserPlus } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, Card, DataTable, Input, PageHeader, Select, StatCard, Textarea } from '../../components/ui';
import { useReferentielCascade } from '../../hooks/useReferentielCascade';

// §4.1 — sélecteurs en cascade (Sous-système → Type → Cycle → Niveau → Série).
// Réutilisé pour la création de classe (§4) et l'inscription élève (§6).
function CascadeFields({ cascade }) {
  const { subsystems, types, cycles, levels, series, value, select, hasSeries } = cascade;
  return (
    <>
      <Select value={value.subsystem_code} onChange={(e) => select('subsystem_code', e.target.value)}>
        <option value="">Sous-système…</option>
        {subsystems.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
      </Select>
      <Select disabled={!value.subsystem_code} value={value.type_code} onChange={(e) => select('type_code', e.target.value)}>
        <option value="">Type d'enseignement…</option>
        {types.map((t) => <option key={t.code} value={t.code}>{t.name_fr}</option>)}
      </Select>
      <Select disabled={!value.type_code} value={value.cycle_code} onChange={(e) => select('cycle_code', e.target.value)}>
        <option value="">Cycle…</option>
        {cycles.map((c) => <option key={c.code} value={c.code}>{c.name_fr}</option>)}
      </Select>
      <Select disabled={!value.cycle_code} value={value.level_code} onChange={(e) => select('level_code', e.target.value)}>
        <option value="">Niveau…</option>
        {levels.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
      </Select>
      {hasSeries && (
        <Select value={value.series_code} onChange={(e) => select('series_code', e.target.value)}>
          <option value="">Série / Spécialité…</option>
          {series.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name_fr}</option>)}
        </Select>
      )}
    </>
  );
}

const evaluationTypes = [
  ['sequence_1', 'Sequence 1'],
  ['sequence_2', 'Sequence 2'],
  ['sequence_3', 'Sequence 3'],
  ['sequence_4', 'Sequence 4'],
  ['sequence_5', 'Sequence 5'],
  ['sequence_6', 'Sequence 6'],
  ['devoir', 'Devoir'],
  ['composition', 'Composition'],
];

const emptyRows = [];

// Bouton Supprimer pour les lignes de tableau (avec confirmation côté page).
function deleteAction(onConfirm) {
  return (
    <div className="flex justify-end">
      <Button variant="danger" className="px-2" title="Supprimer" onClick={onConfirm}><Trash2 size={16} /></Button>
    </div>
  );
}

function Notice({ message, tone = 'emerald' }) {
  if (!message) return null;
  const classesByTone = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${classesByTone[tone]}`}>{message}</div>;
}

function useLoad(loader, fallback) {
  const [rows, setRows] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await loader();
      setRows(Array.isArray(data) && data.length ? data : fallback);
      setError('');
    } catch (err) {
      setRows(fallback);
      setError(err.message || 'Backend indisponible.');
    } finally {
      setLoading(false);
    }
  }, [fallback, loader]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, setRows, loading, error, reload };
}

function classNameById(classes, classeId) {
  const found = classes.find((classe) => String(classe.id) === String(classeId));
  return found?.name || found?.nom || found?.nom_personnalise || null;
}

function studentRow(eleve, classLookup = {}) {
  const classeId = eleve.classe_id || eleve.class_id;
  return {
    id: eleve.id,
    classe_id: classeId ?? null,
    matricule: eleve.matricule || `EL-${eleve.id}`,
    name: [eleve.nom, eleve.prenom].filter(Boolean).join(' ') || eleve.name || 'Eleve',
    className: eleve.classe_nom || eleve.className || eleve.classe?.nom || classLookup[String(classeId)] || '-',
    sexe: eleve.sexe === 'F' ? 'F' : (eleve.sexe === 'M' ? 'M' : '-'),
    parent: eleve.contact_parent || eleve.parent || '-',
    status: eleve.statut || eleve.status || 'Inscrit',
  };
}

function teacherRow(teacher) {
  return {
    id: teacher.id,
    name: [teacher.nom, teacher.prenom].filter(Boolean).join(' ') || teacher.name || 'Enseignant',
    phone: teacher.phone || '-',
    subjects: teacher.specialite || teacher.matieres?.join(', ') || teacher.subjects || '-',
    classes: '-',
    status: teacher.is_active === false ? 'Inactif' : 'Actif',
  };
}

// Libellés badges référentiel.
function subsystemLabel(code, fallbackSection) {
  if (code === 'ANGLOPHONE') return 'Anglophone';
  if (code === 'FRANCOPHONE') return 'Francophone';
  return fallbackSection === 'anglophone' ? 'Anglophone' : 'Francophone';
}
function typeLabel(code) {
  if (code === 'TECHNIQUE') return 'Technique';
  if (code === 'GENERAL') return 'Général';
  return '-';
}

function classRow(classe) {
  return {
    id: classe.id,
    name: classe.nom || classe.nom_personnalise || classe.name,
    subsystem: subsystemLabel(classe.subsystem_code, classe.section),
    subsystem_code: classe.subsystem_code || null,
    type: typeLabel(classe.type_code),
    level: classe.niveau || classe.level_code || classe.niveau_libre || classe.level || '-',
    serie: classe.serie || classe.series_code || classe.specialite_libre || '—',
    students: classe.effectif ?? classe.students ?? 0,
    capacity: classe.capacite || classe.effectif_max || '-',
    nb_matieres: classe.nb_matieres ?? 0,
    statut: classe.statut || (classe.is_special ? 'Spéciale' : 'Standard'),
    prof_principal_id: classe.prof_principal_id ?? null,
  };
}

function subjectRow(subject, classe = null) {
  return {
    id: subject.id,
    classe_id: subject.classe_id || classe?.id,
    name: subject.nom || subject.name,
    code: subject.code || subject.subject_code || String(subject.id),
    coefficient: subject.coefficient || subject.coefficient_defaut || 1,
    teacher: subject.enseignant_id || subject.teacher || '-',
    className: classe?.nom || classe?.nom_personnalise || classe?.name || subject.classe_nom || subject.className || '-',
    status: subject.activated === false ? 'Inactive' : 'Active',
  };
}

const STAFF_FUNCTIONS = ['Censeur', "Directeur d'etudes", 'Surveillant General', 'Surveillant de discipline', 'Principal'];

function personnelRow(p) {
  return {
    id: p.id,
    name: [p.nom, p.prenom].filter(Boolean).join(' ') || 'Personnel',
    fonction: p.fonction || (p.role_type === 'ENSEIGNANT' ? 'Enseignant' : 'Administration'),
    phone: p.phone || '-',
    status: p.is_active === false ? 'Inactif' : 'Actif',
  };
}

const EMPTY_PERSONNEL = { fonction: 'Enseignant', nom: '', prenom: '', sexe: 'M', phone: '', phone2: '', email: '', specialite: '', password: '' };

export function OperationalTeachersPage() {
  const loadPersonnel = useCallback(async () => {
    const [personnel, matieres] = await Promise.all([
      api.fetchPersonnel(),
      api.fetchMatieres().catch(() => []),
    ]);
    // Matières enseignées + classes assignées par enseignant (§9.2).
    const byTeacher = {};
    matieres.forEach((m) => {
      if (m.enseignant_id == null) return;
      const k = String(m.enseignant_id);
      byTeacher[k] = byTeacher[k] || { subjects: new Set(), classes: new Set() };
      if (m.nom) byTeacher[k].subjects.add(m.nom);
      if (m.classe_nom) byTeacher[k].classes.add(m.classe_nom);
    });
    return personnel.map((p) => {
      const agg = byTeacher[String(p.id)];
      return {
        ...personnelRow(p),
        subjects: agg ? [...agg.subjects].join(', ') : '—',
        classes: agg ? [...agg.classes].join(', ') : '—',
      };
    });
  }, []);
  const { rows, setRows, loading, error } = useLoad(loadPersonnel, []);
  const [form, setForm] = useState(EMPTY_PERSONNEL);
  const [notice, setNotice] = useState('');
  const isTeacher = form.fonction === 'Enseignant';

  async function submit(event) {
    event.preventDefault();
    try {
      let created;
      if (isTeacher) {
        created = await api.createProfesseur({
          nom: form.nom, prenom: form.prenom, sexe: form.sexe, phone: form.phone,
          email: form.email, specialite: form.specialite, password: form.password,
        });
      } else {
        if (!form.phone2) { setNotice('Un deuxieme telephone est obligatoire pour ce poste (Direction).'); return; }
        created = await api.createDirection({
          nom: form.nom, prenom: form.prenom, phone: form.phone, phone2: form.phone2,
          fonction: form.fonction, email: form.email, password: form.password,
        });
      }
      setRows((current) => [personnelRow(created), ...current]);
      setForm(EMPTY_PERSONNEL);
      setNotice(`${form.fonction} cree avec succes.`);
    } catch (err) {
      setNotice(err.message || 'Creation impossible.');
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Supprimer "${row.name}" (${row.fonction}) ?`)) return;
    try {
      await api.deleteProfesseur(row.id);
      setRows((current) => current.filter((r) => r.id !== row.id));
    } catch (err) { setNotice(err.message); }
  }

  return (
    <>
      <PageHeader title="Personnel" description="Enseignants, censeurs, directeurs d'etudes et surveillants de l'etablissement." />
      <Notice message={loading ? 'Chargement du personnel...' : error} tone={error ? 'amber' : 'blue'} />
      <Notice message={notice} />
      <DataTable title="Liste du personnel" columns={[
        { key: 'name', label: 'Nom complet' },
        { key: 'fonction', label: 'Fonction', render: (row) => <Badge tone={row.fonction === 'Enseignant' ? 'blue' : 'amber'}>{row.fonction}</Badge> },
        { key: 'phone', label: 'Téléphone' },
        { key: 'subjects', label: 'Matières enseignées' },
        { key: 'classes', label: 'Classes assignées' },
        { key: 'status', label: 'Statut', render: (row) => <Badge tone={row.status === 'Actif' ? 'emerald' : 'rose'}>{row.status}</Badge> },
      ]} rows={rows} renderActions={(row) => deleteAction(() => handleDelete(row))} />
      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-bold">Ajouter un membre du personnel</h2>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Fonction</span>
            <Select value={form.fonction} onChange={(e) => setForm({ ...form, fonction: e.target.value })}>
              <option value="Enseignant">Enseignant</option>
              {STAFF_FUNCTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          </label>
          {isTeacher && (
            <Select value={form.sexe} onChange={(e) => setForm({ ...form, sexe: e.target.value })}><option value="M">Masculin</option><option value="F">Feminin</option></Select>
          )}
          <Input required placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          <Input placeholder="Prenom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          <Input required placeholder="Telephone principal" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          {!isTeacher && (
            <Input required placeholder="Telephone secondaire (obligatoire)" value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} />
          )}
          <Input type="email" placeholder="Email facultatif" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {isTeacher && (
            <Input placeholder="Specialite" value={form.specialite} onChange={(e) => setForm({ ...form, specialite: e.target.value })} />
          )}
          <Input required type="password" placeholder="Mot de passe initial" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit"><UserPlus size={16} /> Creer</Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-slate-400">Les censeurs et directeurs d'etudes peuvent saisir les notes depuis le menu Notes.</p>
      </Card>
    </>
  );
}

export function OperationalClassesPage() {
  const loadClasses = useCallback(async () => {
    const [classes, eleves] = await Promise.all([
      api.fetchClasses(),
      api.fetchEleves_admin().catch(() => []),
    ]);
    // Effectif réel par classe (cross-service eleves).
    const counts = {};
    eleves.forEach((e) => { const c = e.classe_id ?? e.class_id; if (c != null) counts[c] = (counts[c] || 0) + 1; });
    return classes.map((c) => ({ ...classRow(c), students: counts[c.id] || 0 }));
  }, []);
  const { rows, setRows, loading, error } = useLoad(loadClasses, []);
  const { rows: teacherRows } = useLoad(useCallback(async () => (await api.fetchProfesseurs()).map(teacherRow), []), []);
  const [form, setForm] = useState({ nom: '', effectif_max: 40, prof_principal_id: '', niveau_libre: '', specialite_libre: '' });
  const [special, setSpecial] = useState(false);
  const [notice, setNotice] = useState('');
  const cascade = useReferentielCascade();

  async function assignProfPrincipal(row, profId) {
    try {
      await api.setClasseProfPrincipal(row.id, profId);
      setRows((current) => current.map((r) => (r.id === row.id ? { ...r, prof_principal_id: profId ? Number(profId) : null } : r)));
      setNotice('Professeur principal mis a jour.');
    } catch (err) { setNotice(err.message); }
  }

  async function submit(event) {
    event.preventDefault();
    if (!special && !cascade.isComplete) {
      setNotice('Veuillez compléter la cascade (sous-système → … → niveau/série).');
      return;
    }
    try {
      const base = {
        nom_personnalise: form.nom,
        effectif_max: form.effectif_max,
        prof_principal_id: form.prof_principal_id || null,
      };
      const payload = special
        ? { ...base, is_special: true, niveau_libre: form.niveau_libre, specialite_libre: form.specialite_libre }
        : { ...base, is_special: false, ...cascade.value };
      const created = await api.createClasse(payload);
      setRows((current) => [classRow(created), ...current]);
      setForm({ nom: '', effectif_max: 40, prof_principal_id: '', niveau_libre: '', specialite_libre: '' });
      cascade.reset();
      setSpecial(false);
      setNotice(special ? 'Classe spéciale créée.' : 'Classe créée — matières héritées du référentiel.');
    } catch (err) {
      setNotice(err.message || 'Creation de classe impossible.');
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Supprimer la classe "${row.name}" ? Les matieres associees seront supprimees.`)) return;
    try {
      await api.deleteClasse(row.id);
      setRows((current) => current.filter((r) => r.id !== row.id));
    } catch (err) { setNotice(err.message); }
  }

  return (
    <>
      <PageHeader title="Classes" description="Creation de classes standard ou speciales." />
      <Notice message={loading ? 'Chargement des classes...' : error} tone={error ? 'amber' : 'blue'} />
      <Notice message={notice} />
      <DataTable title="Classes" columns={[
        { key: 'name', label: 'Classe' },
        { key: 'subsystem', label: 'Sous-système', render: (row) => <Badge tone={row.subsystem_code === 'ANGLOPHONE' ? 'cyan' : 'violet'}>{row.subsystem}</Badge> },
        { key: 'type', label: 'Type' },
        { key: 'level', label: 'Niveau' },
        { key: 'serie', label: 'Série / Spécialité' },
        { key: 'effectif', label: 'Effectif', render: (row) => `${row.students} / ${row.capacity}` },
        { key: 'prof_principal_id', label: 'Prof. principal', render: (row) => (
          <Select value={String(row.prof_principal_id ?? '')} onChange={(e) => assignProfPrincipal(row, e.target.value)}>
            <option value="">Aucun</option>
            {teacherRows.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        ) },
        { key: 'nb_matieres', label: 'Matières' },
        { key: 'statut', label: 'Statut', render: (row) => <Badge tone={row.statut === 'Spéciale' ? 'amber' : 'slate'}>{row.statut}</Badge> },
      ]} rows={rows} renderActions={(row) => deleteAction(() => handleDelete(row))} />
      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Créer une classe</h2>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input type="checkbox" checked={special} onChange={(e) => setSpecial(e.target.checked)} />
            Classe spéciale (hors référentiel MINESEC)
          </label>
        </div>
        <form id="class-form" className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          {special ? (
            <>
              <Input required placeholder="Niveau (libre)" value={form.niveau_libre} onChange={(e) => setForm({ ...form, niveau_libre: e.target.value })} />
              <Input placeholder="Spécialité (libre)" value={form.specialite_libre} onChange={(e) => setForm({ ...form, specialite_libre: e.target.value })} />
            </>
          ) : (
            <CascadeFields cascade={cascade} />
          )}
          <Input required placeholder="Nom personnalisé (ex. Tle D1)" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          <Input type="number" min="1" placeholder="Effectif maximum" value={form.effectif_max} onChange={(e) => setForm({ ...form, effectif_max: e.target.value })} />
          <Select value={form.prof_principal_id} onChange={(e) => setForm({ ...form, prof_principal_id: e.target.value })}>
            <option value="">Professeur principal (optionnel)</option>
            {teacherRows.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          {special && (
            <p className="md:col-span-2 text-xs text-amber-600">
              Classe hors référentiel : aucune matière n'est pré-remplie. Étiquette « Spéciale » appliquée partout.
            </p>
          )}
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit"><Plus size={16} /> Créer la classe</Button>
          </div>
        </form>
      </Card>
    </>
  );
}

export function OperationalStudentsPage() {
  const loadStudents = useCallback(async () => {
    const [eleves, classesData] = await Promise.all([
      api.fetchEleves_admin(),
      api.fetchClasses().catch(() => []),
    ]);
    const classLookup = Object.fromEntries(classesData.map((classe) => {
      const row = classRow(classe);
      return [String(row.id), row.name];
    }));
    return eleves.map((eleve) => studentRow(eleve, classLookup));
  }, []);
  const { rows, setRows, loading, error } = useLoad(loadStudents, []);
  const [form, setForm] = useState({ nom: '', prenom: '', matricule: '', sexe: '', classe_id: '', parent_nom: '', parent_phone: '', parent_phone2: '', parent_adresse: '' });
  const [notice, setNotice] = useState('');
  const cascade = useReferentielCascade();
  const [filteredClasses, setFilteredClasses] = useState([]);

  // §6 étape 5 : ne proposer que les classes correspondant exactement au profil choisi.
  useEffect(() => {
    if (!cascade.isComplete) { setFilteredClasses([]); return; }
    api.fetchClasses({
      subsystem: cascade.value.subsystem_code,
      type: cascade.value.type_code,
      level: cascade.value.level_code,
      series: cascade.value.series_code || undefined,
    })
      .then((data) => setFilteredClasses(data.map(classRow)))
      .catch(() => setFilteredClasses([]));
    setForm((f) => ({ ...f, classe_id: '' }));
  }, [cascade.isComplete, cascade.value.subsystem_code, cascade.value.type_code, cascade.value.level_code, cascade.value.series_code]);

  async function submit(event) {
    event.preventDefault();
    if (!cascade.isComplete) { setNotice('Complétez la cascade (sous-système → … → niveau/série).'); return; }
    if (!form.classe_id) { setNotice('Choisissez une classe correspondant au profil.'); return; }
    try {
      const created = await api.createEleve_admin({
        nom: form.nom,
        prenom: form.prenom || null,
        matricule: form.matricule || null,
        sexe: form.sexe || null,
        subsystem_code: cascade.value.subsystem_code,
        type_code: cascade.value.type_code,
        cycle_code: cascade.value.cycle_code || null,
        level_code: cascade.value.level_code,
        series_code: cascade.value.series_code || null,
        classe_id: form.classe_id ? Number(form.classe_id) : null,
        parents: form.parent_nom && form.parent_phone
          ? [{ nom: form.parent_nom, phone: form.parent_phone, phone2: form.parent_phone2 || null, adresse: form.parent_adresse || null }]
          : [],
      });
      const classLookup = Object.fromEntries(filteredClasses.map((classe) => [String(classe.id), classe.name]));
      setRows((current) => [studentRow(created, classLookup), ...current]);
      setForm({ nom: '', prenom: '', matricule: '', sexe: '', classe_id: '', parent_nom: '', parent_phone: '', parent_phone2: '', parent_adresse: '' });
      cascade.reset();
      setNotice('Élève inscrit — il hérite des matières de sa classe.');
    } catch (err) {
      setNotice(err.message || "Creation de l'eleve impossible.");
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Supprimer l'eleve "${row.name}" ?`)) return;
    try {
      await api.deleteEleve_admin(row.id);
      setRows((current) => current.filter((r) => r.id !== row.id));
    } catch (err) { setNotice(err.message); }
  }

  return (
    <>
      <PageHeader title="Eleves" description="Inscription operationnelle avec parent et classe." />
      <Notice message={loading ? 'Chargement des eleves...' : error} tone={error ? 'amber' : 'blue'} />
      <Notice message={notice} />
      <DataTable title="Registre des élèves" columns={[
        { key: 'matricule', label: 'Matricule' },
        { key: 'name', label: 'Nom complet' },
        { key: 'className', label: 'Classe', render: (row) => (
          row.classe_id
            ? <Link to="/app/classes" className="font-semibold text-blue-600 hover:underline">{row.className}</Link>
            : row.className
        ) },
        { key: 'sexe', label: 'Sexe' },
        { key: 'parent', label: 'Contact parent' },
        { key: 'status', label: 'Statut', render: (row) => <Badge tone="emerald">{row.status}</Badge> },
      ]} rows={rows} renderActions={(row) => deleteAction(() => handleDelete(row))} />
      <Card className="mt-6 p-5">
        <h2 className="mb-1 font-bold">Inscrire un élève</h2>
        <p className="mb-4 text-sm text-slate-500">Choix en cascade ; la liste des classes est filtrée selon le profil.</p>
        <form id="student-form" className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <Input required placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          <Input placeholder="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          <Input placeholder="Matricule (auto si vide)" value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} />
          <Select value={form.sexe} onChange={(e) => setForm({ ...form, sexe: e.target.value })}><option value="">Sexe</option><option value="M">Masculin</option><option value="F">Féminin</option></Select>

          <div className="md:col-span-2 grid gap-4 md:grid-cols-2 rounded-lg bg-slate-50 p-4">
            <p className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-400">Profil (cascade)</p>
            <CascadeFields cascade={cascade} />
            <Select className="md:col-span-2" value={form.classe_id} onChange={(e) => setForm({ ...form, classe_id: e.target.value })} disabled={!cascade.isComplete}>
              <option value="">{cascade.isComplete ? (filteredClasses.length ? 'Classe correspondante…' : 'Aucune classe pour ce profil') : 'Complétez la cascade'}</option>
              {filteredClasses.map((classe) => <option key={classe.id} value={classe.id}>{classe.name}</option>)}
            </Select>
          </div>

          <Input placeholder="Nom parent/tuteur" value={form.parent_nom} onChange={(e) => setForm({ ...form, parent_nom: e.target.value })} />
          <Input placeholder="Téléphone parent (obligatoire)" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
          <Input placeholder="2e téléphone (optionnel)" value={form.parent_phone2} onChange={(e) => setForm({ ...form, parent_phone2: e.target.value })} />
          <Input placeholder="Adresse (optionnel)" value={form.parent_adresse} onChange={(e) => setForm({ ...form, parent_adresse: e.target.value })} />
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit"><UserPlus size={16} /> Inscrire l'élève</Button>
          </div>
        </form>
      </Card>
    </>
  );
}

export function OperationalSubjectsPage() {
  const { rows: classRows } = useLoad(useCallback(async () => (await api.fetchClasses()).map(classRow), []), []);
  const { rows: teacherRows } = useLoad(useCallback(async () => (await api.fetchProfesseurs()).map(teacherRow), []), []);
  const [selectedClass, setSelectedClass] = useState('');
  const [matieres, setMatieres] = useState([]);
  const [loadingM, setLoadingM] = useState(false);
  const [notice, setNotice] = useState('');
  const [special, setSpecial] = useState({ nom: '', coefficient: 1, volume_horaire: '' });

  const loadMatieres = useCallback(async (classId) => {
    if (!classId) { setMatieres([]); return; }
    setLoadingM(true);
    try { setMatieres(await api.getClassMatieres(classId)); }
    catch (err) { setMatieres([]); setNotice(err.message); }
    finally { setLoadingM(false); }
  }, []);

  useEffect(() => { loadMatieres(selectedClass); }, [selectedClass, loadMatieres]);

  async function assignTeacher(m, enseignantId) {
    try {
      await api.updateMatiere(m.id, { classe_id: selectedClass, enseignant_id: enseignantId ? Number(enseignantId) : null });
      setMatieres((ms) => ms.map((x) => (x.id === m.id ? { ...x, enseignant_id: enseignantId ? Number(enseignantId) : null } : x)));
      setNotice('Affectation enregistree.');
    } catch (err) { setNotice(err.message); }
  }

  async function toggleActivated(m) {
    const next = !m.activated;
    if (m.activated && m.is_obligatoire
      && !window.confirm("Attention : cette matiere est obligatoire pour l'examen officiel de cette serie. Si vous la desactivez, elle n'apparaitra plus sur les bulletins ni dans les statistiques d'examen. Continuer ?")) return;
    try {
      await api.updateMatiere(m.id, { classe_id: selectedClass, activated: next, confirm: true });
      setMatieres((ms) => ms.map((x) => (x.id === m.id ? { ...x, activated: next } : x)));
    } catch (err) { setNotice(err.message); }
  }

  async function addSpecial(event) {
    event.preventDefault();
    if (!selectedClass || !special.nom) { setNotice('Choisissez une classe et un nom de matiere.'); return; }
    try {
      await api.createSpecialMatiere(selectedClass, special);
      setSpecial({ nom: '', coefficient: 1, volume_horaire: '' });
      setNotice('Matiere speciale ajoutee.');
      loadMatieres(selectedClass);
    } catch (err) { setNotice(err.message); }
  }

  return (
    <>
      <PageHeader title="Matieres de la classe" description="Activation, coefficients et affectation des enseignants par classe." />
      <Notice message={notice} tone={/enregistree|ajoutee/.test(notice) ? 'emerald' : 'amber'} />
      <Card className="p-5">
        <label className="block max-w-sm"><span className="mb-1 block text-sm font-semibold text-slate-700">Classe</span>
          <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">Choisir une classe...</option>
            {classRows.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </label>

        {!selectedClass ? (
          <p className="mt-6 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Selectionnez une classe pour gerer ses matieres.</p>
        ) : loadingM ? (
          <p className="mt-6 text-sm text-slate-500">Chargement des matieres...</p>
        ) : matieres.length === 0 ? (
          <p className="mt-6 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Aucune matiere pour cette classe.</p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50"><tr>
                <th className="px-4 py-3 text-left">Matiere</th>
                <th className="px-4 py-3 text-center">Coef.</th>
                <th className="px-4 py-3 text-center">Groupe</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3 text-center">Activee</th>
                <th className="px-4 py-3 text-left">Enseignant assigne</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {matieres.map((m) => (
                  <tr key={m.id} className={m.activated ? '' : 'opacity-50'}>
                    <td className="px-4 py-2 font-semibold">{m.nom}{m.is_obligatoire && <span className="ml-1 text-rose-500" title="Matiere obligatoire">*</span>}</td>
                    <td className="px-4 py-2 text-center">{m.coefficient}</td>
                    <td className="px-4 py-2 text-center">{m.groupe ?? '-'}</td>
                    <td className="px-4 py-2 text-center"><Badge tone={m.source === 'SPECIALE' ? 'amber' : 'blue'}>{m.type || (m.source === 'SPECIALE' ? 'Speciale' : 'Officielle')}</Badge></td>
                    <td className="px-4 py-2 text-center">
                      <input type="checkbox" checked={!!m.activated} onChange={() => toggleActivated(m)} className="h-4 w-4 cursor-pointer accent-blue-600" />
                    </td>
                    <td className="px-4 py-2 w-64">
                      <Select value={String(m.enseignant_id ?? '')} onChange={(e) => assignTeacher(m, e.target.value)}>
                        <option value="">Non assigne</option>
                        {teacherRows.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedClass && (
        <Card className="mt-6 p-5">
          <h2 className="mb-4 font-bold">Ajouter une matiere speciale</h2>
          <form className="grid gap-4 md:grid-cols-3" onSubmit={addSpecial}>
            <Input required placeholder="Nom de la matiere" value={special.nom} onChange={(e) => setSpecial({ ...special, nom: e.target.value })} />
            <Input type="number" min="0" step="0.5" placeholder="Coefficient" value={special.coefficient} onChange={(e) => setSpecial({ ...special, coefficient: e.target.value })} />
            <Input type="number" min="0" placeholder="Volume horaire/sem (optionnel)" value={special.volume_horaire} onChange={(e) => setSpecial({ ...special, volume_horaire: e.target.value })} />
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit"><BookOpen size={16} /> Ajouter la matiere</Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

// Séquences d'un trimestre : T1 → Séq 1 & 2, T2 → Séq 3 & 4, T3 → Séq 5 & 6.
function sequencesForTrimestre(t) {
  const a = 2 * Number(t) - 1;
  const b = 2 * Number(t);
  return [[`sequence_${a}`, `Sequence ${a}`], [`sequence_${b}`, `Sequence ${b}`]];
}

function GradesWorkspace({ professor = false }) {
  const loadClasses = useCallback(
    async () => (professor ? await api.getProfessorClasses() : await api.fetchClasses()).map(classRow),
    [professor],
  );
  const { rows: classRows } = useLoad(loadClasses, []);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [trimestre, setTrimestre] = useState(1);
  const [typeEvaluation, setTypeEvaluation] = useState('sequence_1');
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [values, setValues] = useState({});
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [entryOpen, setEntryOpen] = useState(null);

  const seqOptions = sequencesForTrimestre(trimestre);

  // Changement de trimestre → recadre la séquence sur celles du trimestre.
  function changeTrimestre(t) {
    setTrimestre(t);
    setTypeEvaluation(`sequence_${2 * Number(t) - 1}`);
  }

  // Charge élèves + matières de la classe.
  useEffect(() => {
    if (!selectedClass) { setStudents([]); setSubjects([]); setSelectedSubject(''); return; }
    Promise.all([
      api.getClassEleves(selectedClass).then((data) => data.map((eleve) => studentRow(eleve, {
        [String(selectedClass)]: classNameById(classRows, selectedClass),
      }))).catch(() => []),
      api.getClassMatieres(selectedClass).then((data) => data.map(subjectRow)).catch(() => []),
    ]).then(([nextStudents, nextSubjects]) => {
      setStudents(nextStudents);
      setSubjects(nextSubjects);
      setSelectedSubject(nextSubjects[0]?.id ? String(nextSubjects[0].id) : '');
    });
  }, [selectedClass, classRows]);

  // Statut de la fenêtre de saisie (délais) pour la classe/matière sélectionnée.
  useEffect(() => {
    if (!selectedClass || !selectedSubject) { setEntryOpen(null); return; }
    let active = true;
    api.verifierPeriodeSaisie(selectedClass, selectedSubject)
      .then((r) => { if (active) setEntryOpen(r?.open !== false); })
      .catch(() => { if (active) setEntryOpen(true); });
    return () => { active = false; };
  }, [selectedClass, selectedSubject]);

  // Préremplit avec les notes déjà saisies pour (classe, matière, trimestre, séquence).
  useEffect(() => {
    if (!selectedClass || !selectedSubject) { setValues({}); return; }
    let active = true;
    api.fetchNotes({
      classe_id: Number(selectedClass), matiere_id: Number(selectedSubject),
      trimestre: Number(trimestre), type_evaluation: typeEvaluation,
    }).then((notes) => {
      if (!active) return;
      const map = {};
      (Array.isArray(notes) ? notes : []).forEach((n) => { map[n.eleve_id] = n.valeur; });
      setValues(map);
    }).catch(() => { if (active) setValues({}); });
    return () => { active = false; };
  }, [selectedClass, selectedSubject, trimestre, typeEvaluation]);

  async function submit(event) {
    event.preventDefault();
    const notes = students
      .map((student) => ({ eleve_id: Number(student.id), valeur: Number(values[student.id]) }))
      .filter((item) => Number.isFinite(item.valeur) && item.valeur >= 0 && item.valeur <= 20);
    if (!selectedClass || !selectedSubject || !notes.length) {
      setNotice('Selectionnez une classe, une matiere et saisissez au moins une note (0 a 20).');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      await api.postNotesBulk({
        classe_id: Number(selectedClass),
        matiere_id: Number(selectedSubject),
        trimestre: Number(trimestre),
        type_evaluation: typeEvaluation,
        notes,
      });
      setNotice(`${notes.length} note(s) enregistree(s) avec succes.`);
    } catch (err) {
      setNotice(err.message || 'Saisie des notes impossible.');
    } finally {
      setSaving(false);
    }
  }

  const subjectName = subjects.find((s) => String(s.id) === String(selectedSubject))?.name;

  return (
    <>
      <PageHeader title={professor ? 'Mes notes' : 'Saisie des notes'} description="Choisir la classe, la matiere, le trimestre et la sequence, puis remplir les notes." />
      <Notice message={notice} tone={notice.includes('succes') ? 'emerald' : 'amber'} />
      <Card className="p-5">
        <form id="grades-form" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">Classe</span>
              <Select required value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}><option value="">Choisir...</option>{classRows.map((classe) => <option key={classe.id} value={classe.id}>{classe.name}</option>)}</Select>
            </label>
            <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">Matiere</span>
              <Select required value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={!subjects.length}><option value="">Choisir...</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select>
            </label>
            <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">Trimestre</span>
              <Select value={trimestre} onChange={(e) => changeTrimestre(e.target.value)}><option value="1">Trimestre 1</option><option value="2">Trimestre 2</option><option value="3">Trimestre 3</option></Select>
            </label>
            <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">Sequence</span>
              <Select value={typeEvaluation} onChange={(e) => setTypeEvaluation(e.target.value)}>{seqOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
            </label>
          </div>

          {selectedSubject && entryOpen !== null && (
            <div className="mt-4">
              {entryOpen
                ? <Badge tone="emerald">Saisie ouverte</Badge>
                : <Badge tone="rose">Saisie fermee (delai depasse pour cette classe/matiere)</Badge>}
            </div>
          )}

          {!selectedClass ? (
            <p className="mt-6 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Selectionnez une classe pour afficher les eleves.</p>
          ) : students.length === 0 ? (
            <p className="mt-6 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Aucun eleve dans cette classe.</p>
          ) : (
            <>
              <p className="mt-5 text-sm text-slate-500">{students.length} eleve(s){subjectName ? ` - ${subjectName}` : ''}</p>
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left">Matricule</th><th className="px-4 py-3 text-left">Eleve</th><th className="px-4 py-3 text-left">Note / 20</th><th className="px-4 py-3 text-right">Bulletin</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-2 text-slate-500">{student.matricule}</td>
                        <td className="px-4 py-2 font-semibold">{student.name}</td>
                        <td className="px-4 py-2 w-32">
                          <Input type="number" min="0" max="20" step="0.25" placeholder="-"
                            value={values[student.id] ?? ''}
                            onChange={(e) => setValues((v) => ({ ...v, [student.id]: e.target.value }))} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button type="button" variant="secondary" className="px-2" title="Apercu / PDF du bulletin"
                            onClick={() => api.exportEleveBulletinPdf(student.id, Number(trimestre)).catch((err) => setNotice(err.message))}>
                            <Download size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 flex items-center justify-end gap-3">
                {entryOpen === false && <span className="text-sm text-rose-600">Saisie fermee pour cette classe/matiere.</span>}
                <Button type="submit" disabled={saving || entryOpen === false}><CheckCircle2 size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
              </div>
            </>
          )}
        </form>
      </Card>
    </>
  );
}

export function OperationalGradesPage() {
  return <GradesWorkspace />;
}

function BulletinsWorkspace({ professor = false }) {
  const { rows: classRows } = useLoad(useCallback(async () => (await api.getProfessorClasses()).map(classRow), []), []);
  const [selectedClass, setSelectedClass] = useState('');
  const [trimestre, setTrimestre] = useState(1);
  const [students, setStudents] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [selectedBulletin, setSelectedBulletin] = useState(null);
  const [notice, setNotice] = useState('');

  const loadClassData = useCallback(async (classId = selectedClass) => {
    if (!classId) return;
    const [nextStudents, nextBulletins] = await Promise.all([
      api.getClassEleves(classId).then((data) => data.map((eleve) => studentRow(eleve, {
        [String(classId)]: classNameById(classRows, classId),
      }))).catch(() => []),
      api.fetchClasseBulletins(classId, trimestre).then((data) => data.bulletins || data || []).catch(() => []),
    ]);
    setStudents(nextStudents);
    setBulletins(Array.isArray(nextBulletins) ? nextBulletins : []);
  }, [selectedClass, trimestre, classRows]);

  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  async function preview(student) {
    try {
      const data = await api.fetchEleveBulletin(student.id, trimestre);
      setSelectedBulletin(data.bulletin || data);
      setNotice('');
    } catch (err) {
      setNotice(err.message || 'Generation du bulletin impossible.');
    }
  }

  async function publish(student) {
    try {
      await api.publishEleveBulletin(student.id, trimestre);
      setNotice('Bulletin publie avec succes.');
      await loadClassData();
    } catch (err) {
      setNotice(err.message || 'Publication du bulletin impossible.');
    }
  }

  return (
    <>
      <PageHeader title={professor ? 'Bulletins de mes eleves' : 'Bulletins'} description="Generation, apercu, publication et export PDF des bulletins." />
      <Notice message={notice} tone={notice.includes('succes') ? 'emerald' : 'amber'} />
      <Card className="mb-6 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}><option value="">Classe</option>{classRows.map((classe) => <option key={classe.id} value={classe.id}>{classe.name}</option>)}</Select>
          <Select value={trimestre} onChange={(e) => setTrimestre(e.target.value)}><option value="1">Trimestre 1</option><option value="2">Trimestre 2</option><option value="3">Trimestre 3</option></Select>
          <Button variant="secondary" onClick={() => loadClassData()}><FileText size={16} /> Charger</Button>
        </div>
      </Card>
      <DataTable title="Eleves" columns={[
        { key: 'name', label: 'Eleve' },
        { key: 'matricule', label: 'Matricule' },
        { key: 'className', label: 'Classe' },
      ]} rows={students} renderActions={(row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => preview(row)}><Eye size={16} /> Apercu</Button>
          {!professor && <Button onClick={() => publish(row)}><CheckCircle2 size={16} /> Publier</Button>}
          {!professor && <Button variant="secondary" onClick={() => api.exportEleveBulletinPdf(row.id, trimestre)}><Download size={16} /> PDF</Button>}
        </div>
      )} />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-bold">Classement calcule</h2>
          <div className="mt-4 space-y-3">
            {bulletins.slice(0, 6).map((item, index) => (
              <div key={item.eleve_id || index} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <span>{item.eleve || item.nom || `Eleve ${item.eleve_id}`}</span>
                <Badge tone="blue">{item.moyenne_generale || item.average || '-'} / 20</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold">Apercu bulletin</h2>
          {selectedBulletin ? (
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p><strong>Eleve:</strong> {selectedBulletin.eleve || `${selectedBulletin.nom || ''} ${selectedBulletin.prenom || ''}`}</p>
              <p><strong>Moyenne:</strong> {selectedBulletin.moyenne_generale || selectedBulletin.average || '-'} / 20</p>
              <p><strong>Rang:</strong> {selectedBulletin.rang_label || selectedBulletin.rang || '-'}</p>
              <Textarea readOnly value={JSON.stringify(selectedBulletin.details_notes || selectedBulletin.details_matieres || [], null, 2)} rows={8} />
            </div>
          ) : <p className="mt-4 text-sm text-slate-500">Selectionnez un eleve pour generer un apercu.</p>}
        </Card>
      </div>
    </>
  );
}

export function OperationalBulletinsPage() {
  return <BulletinsWorkspace />;
}

export function ProfessorDashboardPage() {
  const stats = [
    { label: 'Mes classes', value: '4', trend: 'Cette annee', icon: School, tone: 'blue' },
    { label: 'Eleves suivis', value: '186', trend: 'Toutes classes', icon: GraduationCap, tone: 'emerald' },
    { label: 'Notes saisies', value: '72', trend: 'Ce trimestre', icon: CheckCircle2, tone: 'amber' },
  ];
  return (
    <>
      <PageHeader title="Espace professeur" description="Vue de travail pour classes, eleves, notes et bulletins." />
      <div className="grid gap-4 md:grid-cols-3">{stats.map((item) => <StatCard key={item.label} {...item} />)}</div>
    </>
  );
}

export function ProfessorClassesPage() {
  const loadClasses = useCallback(async () => (await api.getProfessorClasses()).map(classRow), []);
  const { rows, loading, error } = useLoad(loadClasses, []);
  return (
    <>
      <PageHeader title="Mes classes" description="Classes affectees au professeur connecte." />
      <Notice message={loading ? 'Chargement des classes...' : error} tone={error ? 'amber' : 'blue'} />
      <DataTable title="Classes affectees" columns={[
        { key: 'name', label: 'Classe' },
        { key: 'level', label: 'Niveau' },
        { key: 'students', label: 'Effectif' },
        { key: 'capacity', label: 'Capacite' },
      ]} rows={rows} />
    </>
  );
}

export function ProfessorStudentsPage() {
  const loadClasses = useCallback(async () => (await api.getProfessorClasses()).map(classRow), []);
  const { rows: classRows } = useLoad(loadClasses, []);
  const [selectedClass, setSelectedClass] = useState('');
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!selectedClass) return;
    api.getClassEleves(selectedClass)
      .then((data) => {
        setRows(data.map((eleve) => studentRow(eleve, {
          [String(selectedClass)]: classNameById(classRows, selectedClass),
        })));
        setNotice('');
      })
      .catch((err) => {
        setRows([]);
        setNotice(err.message || 'Backend indisponible.');
      });
  }, [selectedClass, classRows]);

  return (
    <>
      <PageHeader title="Mes eleves" description="Consultation des eleves par classe affectee." />
      <Notice message={notice} tone="amber" />
      <Card className="mb-6 p-5">
        <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
          <option value="">Selectionner une classe</option>
          {classRows.map((classe) => <option key={classe.id} value={classe.id}>{classe.name}</option>)}
        </Select>
      </Card>
      <DataTable title="Eleves suivis" columns={[
        { key: 'matricule', label: 'Matricule' },
        { key: 'name', label: 'Nom' },
        { key: 'className', label: 'Classe' },
        { key: 'parent', label: 'Contact parent' },
      ]} rows={rows} />
    </>
  );
}

export function ProfessorGradesPage() {
  return <GradesWorkspace professor />;
}

export function ProfessorBulletinsPage() {
  return <BulletinsWorkspace professor />;
}

export function ProfessorProfilePage() {
  return (
    <>
      <PageHeader title="Mon profil" description="Informations de connexion et preferences professeur." />
      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Nom" />
          <Input placeholder="Telephone" />
          <Input placeholder="Email" />
          <Input placeholder="Specialite" />
        </div>
        <Button className="mt-5">Enregistrer</Button>
      </Card>
    </>
  );
}
