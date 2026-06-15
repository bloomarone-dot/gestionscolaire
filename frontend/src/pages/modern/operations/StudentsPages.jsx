import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRightLeft, Trash2, UserPlus } from "lucide-react";
import * as api from "../../../api/api";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  PageHeader,
  Select,
} from "../../../components/ui";
import { useReferentielCascade } from "../../../hooks/useReferentielCascade";
import {
  CascadeFields,
  Notice,
  classRow,
  studentRow,
  useLoad,
} from "./shared";

export function OperationalStudentsPage() {
  const loadStudents = useCallback(async () => {
    const [eleves, classesData] = await Promise.all([
      api.fetchEleves_admin(),
      api.fetchClasses().catch(() => []),
    ]);
    const classLookup = Object.fromEntries(
      classesData.map((classe) => {
        const row = classRow(classe);
        return [String(row.id), row.name];
      }),
    );
    return eleves.map((eleve) => studentRow(eleve, classLookup));
  }, []);
  const { rows, setRows, loading, error } = useLoad(loadStudents, []);
  const [notice, setNotice] = useState("");
  const [allClasses, setAllClasses] = useState([]);
  const [transfer, setTransfer] = useState(null); // §6.3 : { student, targetId }

  useEffect(() => {
    api
      .fetchClasses()
      .then(setAllClasses)
      .catch(() => setAllClasses([]));
  }, []);

  // Classes éligibles au transfert : même niveau (et même série si définie), §6.3.
  function eligibleFor(student) {
    const cur = allClasses.find(
      (c) => String(c.id) === String(student.classe_id),
    );
    if (!cur)
      return allClasses.filter(
        (c) => String(c.id) !== String(student.classe_id),
      );
    return allClasses.filter(
      (c) =>
        c.level_code === cur.level_code &&
        (cur.series_code ? c.series_code === cur.series_code : true) &&
        String(c.id) !== String(student.classe_id),
    );
  }

  async function confirmTransfer() {
    if (!transfer?.targetId) {
      setNotice("Choisissez la classe de destination.");
      return;
    }
    try {
      await api.transferEleve(transfer.student.id, transfer.targetId);
      const target = allClasses.find(
        (c) => String(c.id) === String(transfer.targetId),
      );
      const targetName =
        target?.nom || target?.nom_personnalise || transfer.student.className;
      setRows((cur) =>
        cur.map((r) =>
          r.id === transfer.student.id
            ? {
                ...r,
                classe_id: Number(transfer.targetId),
                className: targetName,
              }
            : r,
        ),
      );
      setNotice("Élève transféré — historique des notes conservé.");
      setTransfer(null);
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Supprimer l'eleve "${row.name}" ?`)) return;
    try {
      await api.deleteEleve_admin(row.id);
      setRows((current) => current.filter((r) => r.id !== row.id));
    } catch (err) {
      setNotice(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Élèves"
        actions={
          <Link to="/app/students/nouveau">
            <Button>
              <UserPlus size={16} /> Nouvel élève
            </Button>
          </Link>
        }
      />
      <Notice
        message={loading ? "Chargement des eleves..." : error}
        tone={error ? "amber" : "blue"}
      />
      <Notice message={notice} />
      {transfer && (
        <Card className="mb-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <p className="text-sm font-semibold text-slate-700">
              Transférer{" "}
              <span className="text-blue-700">{transfer.student.name}</span>{" "}
              vers :
            </p>
            <Select
              className="md:w-72"
              value={transfer.targetId}
              onChange={(e) =>
                setTransfer({ ...transfer, targetId: e.target.value })
              }
            >
              <option value="">Classe de destination (même niveau)…</option>
              {eligibleFor(transfer.student).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom || c.nom_personnalise}
                </option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Button onClick={confirmTransfer}>
                <ArrowRightLeft size={16} /> Confirmer
              </Button>
              <Button variant="secondary" onClick={() => setTransfer(null)}>
                Annuler
              </Button>
            </div>
          </div>
        </Card>
      )}
      <DataTable
        title="Registre des élèves"
        columns={[
          { key: "matricule", label: "Matricule" },
          { key: "name", label: "Nom complet" },
          {
            key: "className",
            label: "Classe",
            render: (row) =>
              row.classe_id ? (
                <Link
                  to={`/app/classes?highlight=${row.classe_id}`}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  {row.className}
                </Link>
              ) : (
                row.className
              ),
          },
          { key: "sexe", label: "Sexe" },
          { key: "parent", label: "Contact parent" },
          {
            key: "status",
            label: "Statut",
            render: (row) => <Badge tone="emerald">{row.status}</Badge>,
          },
        ]}
        rows={rows}
        renderActions={(row) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              className="px-2"
              title="Transférer (§6.3)"
              onClick={() => setTransfer({ student: row, targetId: "" })}
            >
              <ArrowRightLeft size={16} />
            </Button>
            <Button
              variant="danger"
              className="px-2"
              title="Supprimer"
              onClick={() => handleDelete(row)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      />
    </>
  );
}

export function EleveCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    matricule: "",
    sexe: "",
    classe_id: "",
    parent_nom: "",
    parent_phone: "",
    parent_phone2: "",
    parent_adresse: "",
  });
  const [notice, setNotice] = useState("");
  const cascade = useReferentielCascade();
  const [filteredClasses, setFilteredClasses] = useState([]);

  // §6 étape 5 : ne proposer que les classes correspondant exactement au profil choisi.
  useEffect(() => {
    if (!cascade.isComplete) {
      setFilteredClasses([]);
      return;
    }
    api
      .fetchClasses({
        subsystem: cascade.value.subsystem_code,
        type: cascade.value.type_code,
        level: cascade.value.level_code,
        series: cascade.value.series_code || undefined,
      })
      .then((data) => setFilteredClasses(data.map(classRow)))
      .catch(() => setFilteredClasses([]));
    setForm((f) => ({ ...f, classe_id: "" }));
  }, [
    cascade.isComplete,
    cascade.value.subsystem_code,
    cascade.value.type_code,
    cascade.value.level_code,
    cascade.value.series_code,
  ]);

  async function submit(event) {
    event.preventDefault();
    if (!cascade.isComplete) {
      setNotice("Complétez la cascade (sous-système → … → niveau/série).");
      return;
    }
    if (!form.classe_id) {
      setNotice("Choisissez une classe correspondant au profil.");
      return;
    }
    try {
      await api.createEleve_admin({
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
        parents:
          form.parent_nom && form.parent_phone
            ? [
                {
                  nom: form.parent_nom,
                  phone: form.parent_phone,
                  phone2: form.parent_phone2 || null,
                  adresse: form.parent_adresse || null,
                },
              ]
            : [],
      });
      navigate("/app/students");
    } catch (err) {
      setNotice(err.message || "Creation de l'eleve impossible.");
    }
  }

  return (
    <>
      <PageHeader
        title="Nouvel élève"
        breadcrumb
        actions={
          <Link to="/app/students">
            <Button variant="secondary">Retour à la liste</Button>
          </Link>
        }
      />
      <Notice message={notice} tone="rose" />
      <Card className="p-5">
        <form
          id="student-form"
          className="grid gap-4 md:grid-cols-2"
          onSubmit={submit}
        >
          <Input
            required
            placeholder="Nom"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
          />
          <Input
            placeholder="Prénom"
            value={form.prenom}
            onChange={(e) => setForm({ ...form, prenom: e.target.value })}
          />
          <Input
            placeholder="Matricule (auto si vide)"
            value={form.matricule}
            onChange={(e) => setForm({ ...form, matricule: e.target.value })}
          />
          <Select
            value={form.sexe}
            onChange={(e) => setForm({ ...form, sexe: e.target.value })}
          >
            <option value="">Sexe</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </Select>

          <div className="md:col-span-2 grid gap-4 md:grid-cols-2 rounded-lg bg-slate-50 p-4">
            <p className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              Profil (cascade)
            </p>
            <CascadeFields cascade={cascade} />
            <Select
              className="md:col-span-2"
              value={form.classe_id}
              onChange={(e) => setForm({ ...form, classe_id: e.target.value })}
              disabled={!cascade.isComplete}
            >
              <option value="">
                {cascade.isComplete
                  ? filteredClasses.length
                    ? "Classe correspondante…"
                    : "Aucune classe pour ce profil"
                  : "Complétez la cascade"}
              </option>
              {filteredClasses.map((classe) => (
                <option key={classe.id} value={classe.id}>
                  {classe.name}
                </option>
              ))}
            </Select>
          </div>

          <Input
            placeholder="Nom parent/tuteur"
            value={form.parent_nom}
            onChange={(e) => setForm({ ...form, parent_nom: e.target.value })}
          />
          <Input
            placeholder="Téléphone parent (obligatoire)"
            value={form.parent_phone}
            onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
          />
          <Input
            placeholder="2e téléphone (optionnel)"
            value={form.parent_phone2}
            onChange={(e) =>
              setForm({ ...form, parent_phone2: e.target.value })
            }
          />
          <Input
            placeholder="Adresse (optionnel)"
            value={form.parent_adresse}
            onChange={(e) =>
              setForm({ ...form, parent_adresse: e.target.value })
            }
          />
          <div className="md:col-span-2 flex justify-end gap-2">
            <Link to="/app/students">
              <Button type="button" variant="secondary">
                Annuler
              </Button>
            </Link>
            <Button type="submit">
              <UserPlus size={16} /> Inscrire l'élève
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
