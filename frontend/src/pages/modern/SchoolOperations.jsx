import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Download, Eye, FileText, GraduationCap, Plus, School, Trash2, UserPlus } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, Card, DataTable, Input, PageHeader, Select, StatCard, Textarea } from '../../components/ui';

const levelOptions = [
  ['6E', '6eme'], ['5E', '5eme'], ['4E', '4eme'], ['3E', '3eme'],
  ['2ND', '2nde'], ['1ERE', '1ere'], ['TLE', 'Terminale'],
  ['F1', 'Form 1'], ['F2', 'Form 2'], ['F3', 'Form 3'], ['F4', 'Form 4'], ['F5', 'Form 5'],
];

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
    matricule: eleve.matricule || `EL-${eleve.id}`,
    name: [eleve.nom, eleve.prenom].filter(Boolean).join(' ') || eleve.name || 'Eleve',
    className: eleve.classe_nom || eleve.className || eleve.classe?.nom || classLookup[String(classeId)] || '-',
    parent: eleve.contact_parent || eleve.parent || '-',
    status: eleve.statut || eleve.status || 'Actif',
  };
}

function teacherRow(teacher) {
  return {
    id: teacher.id,
    name: [teacher.nom, teacher.prenom].filter(Boolean).join(' ') || teacher.name || 'Enseignant',
    phone: teacher.phone || '-',
    subjects: teacher.specialite || teacher.matieres?.join(', ') || teacher.subjects || '-',
    status: teacher.is_active === false ? 'Inactif' : 'Actif',
  };
}

function classRow(classe) {
  return {
    id: classe.id,
    name: classe.nom || classe.nom_personnalise || classe.name,
    level: classe.niveau || classe.level_code || classe.niveau_libre || classe.level || '-',
    students: classe.effectif || classe.students || 0,
    capacity: classe.capacite || classe.effectif_max || '-',
    mainTeacher: classe.prof_principal_id || classe.mainTeacher || '-',
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
  const loadPersonnel = useCallback(async () => (await api.fetchPersonnel()).map(personnelRow), []);
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
        { key: 'name', label: 'Nom' },
        { key: 'fonction', label: 'Fonction', render: (row) => <Badge tone={row.fonction === 'Enseignant' ? 'blue' : 'amber'}>{row.fonction}</Badge> },
        { key: 'phone', label: 'Telephone' },
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
  const loadClasses = useCallback(async () => (await api.fetchClasses()).map(classRow), []);
  const { rows, setRows, loading, error } = useLoad(loadClasses, []);
  const [form, setForm] = useState({ nom: '', effectif_max: 40, level_code: '', series_code: '', section: 'francophone' });
  const [notice, setNotice] = useState('');

  async function submit(event) {
    event.preventDefault();
    try {
      const created = await api.createClasse({
        nom: form.nom,
        nom_personnalise: form.nom,
        effectif_max: form.effectif_max,
        level_code: form.level_code || null,
        series_code: form.series_code || null,
        section: form.section,
        niveau_libre: form.level_code ? '' : form.nom,
      });
      setRows((current) => [classRow(created), ...current]);
      setForm({ nom: '', effectif_max: 40, level_code: '', series_code: '', section: 'francophone' });
      setNotice('Classe creee avec succes.');
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
        { key: 'level', label: 'Niveau' },
        { key: 'capacity', label: 'Capacite' },
        { key: 'students', label: 'Effectif' },
      ]} rows={rows} renderActions={(row) => deleteAction(() => handleDelete(row))} />
      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-bold">Creer une classe</h2>
        <form id="class-form" className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <Input required placeholder="Nom de la classe" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          <Input type="number" min="1" placeholder="Capacite" value={form.effectif_max} onChange={(e) => setForm({ ...form, effectif_max: e.target.value })} />
          <Select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}><option value="francophone">Francophone</option><option value="anglophone">Anglophone</option></Select>
          <Select value={form.level_code} onChange={(e) => setForm({ ...form, level_code: e.target.value })}>
            <option value="">Classe speciale / niveau libre</option>
            {levelOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Input placeholder="Serie ou specialite" value={form.series_code} onChange={(e) => setForm({ ...form, series_code: e.target.value })} />
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit"><Plus size={16} /> Creer la classe</Button>
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
  const loadClasses = useCallback(async () => (await api.fetchClasses()).map(classRow), []);
  const { rows, setRows, loading, error } = useLoad(loadStudents, []);
  const { rows: classRows } = useLoad(loadClasses, []);
  const [form, setForm] = useState({ nom: '', prenom: '', matricule: '', sexe: '', classe_id: '', parent_nom: '', parent_phone: '' });
  const [notice, setNotice] = useState('');

  async function submit(event) {
    event.preventDefault();
    try {
      const created = await api.createEleve_admin({
        nom: form.nom,
        prenom: form.prenom || null,
        matricule: form.matricule || null,
        sexe: form.sexe || null,
        classe_id: form.classe_id ? Number(form.classe_id) : null,
        parents: form.parent_nom && form.parent_phone ? [{ nom: form.parent_nom, phone: form.parent_phone }] : [],
      });
      const classLookup = Object.fromEntries(classRows.map((classe) => [String(classe.id), classe.name]));
      setRows((current) => [studentRow(created, classLookup), ...current]);
      setForm({ nom: '', prenom: '', matricule: '', sexe: '', classe_id: '', parent_nom: '', parent_phone: '' });
      setNotice('Eleve cree avec succes.');
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
      <DataTable title="Registre des eleves" columns={[
        { key: 'matricule', label: 'Matricule' },
        { key: 'name', label: 'Nom' },
        { key: 'className', label: 'Classe' },
        { key: 'parent', label: 'Parent' },
        { key: 'status', label: 'Statut', render: (row) => <Badge tone="emerald">{row.status}</Badge> },
      ]} rows={rows} renderActions={(row) => deleteAction(() => handleDelete(row))} />
      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-bold">Inscrire un eleve</h2>
        <form id="student-form" className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <Input required placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          <Input placeholder="Prenom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          <Input placeholder="Matricule auto si vide" value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} />
          <Select value={form.sexe} onChange={(e) => setForm({ ...form, sexe: e.target.value })}><option value="">Sexe</option><option value="M">Masculin</option><option value="F">Feminin</option></Select>
          <Select value={form.classe_id} onChange={(e) => setForm({ ...form, classe_id: e.target.value })}>
            <option value="">Classe</option>
            {classRows.map((classe) => <option key={classe.id} value={classe.id}>{classe.name}</option>)}
          </Select>
          <Input placeholder="Nom parent/tuteur" value={form.parent_nom} onChange={(e) => setForm({ ...form, parent_nom: e.target.value })} />
          <Input placeholder="Telephone parent" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit"><UserPlus size={16} /> Inscrire l'eleve</Button>
          </div>
        </form>
      </Card>
    </>
  );
}

export function OperationalSubjectsPage() {
  const loadClasses = useCallback(async () => (await api.fetchClasses()).map(classRow), []);
  const loadSubjects = useCallback(async () => (await api.fetchMatieres()).map(subjectRow), []);
  const loadTeachers = useCallback(async () => (await api.fetchProfesseurs()).map(teacherRow), []);
  const { rows, setRows, loading, error } = useLoad(loadSubjects, emptyRows);
  const { rows: classRows } = useLoad(loadClasses, []);
  const { rows: teacherRows } = useLoad(loadTeachers, emptyRows);
  const [form, setForm] = useState({ classe_id: '', nom: '', coefficient: 1, volume_horaire: '', enseignant_id: '' });
  const [notice, setNotice] = useState('');

  async function submit(event) {
    event.preventDefault();
    try {
      const created = await api.createMatiere(form);
      const classe = classRows.find((item) => String(item.id) === String(form.classe_id));
      setRows((current) => [subjectRow(created, classe), ...current]);
      setForm({ classe_id: '', nom: '', coefficient: 1, volume_horaire: '', enseignant_id: '' });
      setNotice(form.enseignant_id ? 'Matiere creee et professeur associe.' : 'Matiere creee pour la classe.');
    } catch (err) {
      setNotice(err.message || 'Creation de matiere impossible.');
    }
  }

  return (
    <>
      <PageHeader title="Matieres" description="Creation de matieres speciales et affectation par classe." />
      <Notice message={loading ? 'Chargement des matieres...' : error} tone={error ? 'amber' : 'blue'} />
      <Notice message={notice} />
      <DataTable title="Matieres de classe" columns={[
        { key: 'name', label: 'Matiere' },
        { key: 'code', label: 'Code' },
        { key: 'coefficient', label: 'Coef.' },
        { key: 'className', label: 'Classe' },
        { key: 'status', label: 'Statut', render: (row) => <Badge tone={row.status === 'Active' ? 'emerald' : 'rose'}>{row.status}</Badge> },
      ]} rows={rows.length ? rows : [{ id: 'empty', name: 'Aucune matiere chargee', code: '-', coefficient: '-', className: '-', status: 'Inactive' }]} />
      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-bold">Ajouter une matiere speciale</h2>
        <form id="subject-form" className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <Select required value={form.classe_id} onChange={(e) => setForm({ ...form, classe_id: e.target.value })}>
            <option value="">Classe cible</option>
            {classRows.map((classe) => <option key={classe.id} value={classe.id}>{classe.name}</option>)}
          </Select>
          <Input required placeholder="Nom de la matiere" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          <Input required type="number" min="0" step="0.5" placeholder="Coefficient" value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: e.target.value })} />
          <Input type="number" min="0" placeholder="Volume horaire/semaine" value={form.volume_horaire} onChange={(e) => setForm({ ...form, volume_horaire: e.target.value })} />
          <Select value={form.enseignant_id} onChange={(e) => setForm({ ...form, enseignant_id: e.target.value })}>
            <option value="">Associer un professeur (facultatif)</option>
            {teacherRows.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
          </Select>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit"><BookOpen size={16} /> Creer la matiere</Button>
          </div>
        </form>
      </Card>
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
