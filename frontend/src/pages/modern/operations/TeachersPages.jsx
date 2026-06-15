import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { UserPlus } from "lucide-react";
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
import {
  EMPTY_PERSONNEL,
  Notice,
  STAFF_FUNCTIONS,
  deleteAction,
  emptyRows,
  personnelRow,
  subjectRow,
  useLoad,
} from "./shared";

export function OperationalTeachersPage() {
  const [searchParams] = useSearchParams();
  const view =
    searchParams.get("fonction") === "direction" ? "direction" : "enseignant";
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
      byTeacher[k] = byTeacher[k] || {
        subjects: new Set(),
        classes: new Set(),
      };
      if (m.nom) byTeacher[k].subjects.add(m.nom);
      if (m.classe_nom) byTeacher[k].classes.add(m.classe_nom);
    });
    return personnel
      .map((p) => {
        const agg = byTeacher[String(p.id)];
        return {
          ...personnelRow(p),
          subjects: agg ? [...agg.subjects].join(", ") : "—",
          classes: agg ? [...agg.classes].join(", ") : "—",
        };
      })
      .filter((p) =>
        view === "enseignant"
          ? p.fonction === "Enseignant"
          : p.fonction !== "Enseignant",
      );
  }, [view]);
  const { rows, setRows, loading, error } = useLoad(loadPersonnel, []);
  const [notice, setNotice] = useState("");

  const pageTitle =
    view === "direction" ? "Direction / Administration" : "Enseignants";

  const createHref =
    view === "direction"
      ? "/app/teachers/nouveau?fonction=direction"
      : "/app/teachers/nouveau";

  async function handleDelete(row) {
    if (!window.confirm(`Supprimer "${row.name}" (${row.fonction}) ?`)) return;
    try {
      await api.deleteProfesseur(row.id);
      setRows((current) => current.filter((r) => r.id !== row.id));
    } catch (err) {
      setNotice(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title={pageTitle}
        actions={
          <Link to={createHref}>
            <Button>
              <UserPlus size={16} /> Nouveau membre
            </Button>
          </Link>
        }
      />
      <Notice
        message={loading ? "Chargement du personnel..." : error}
        tone={error ? "amber" : "blue"}
      />
      <Notice message={notice} />
      <DataTable
        title="Liste du personnel"
        columns={[
          { key: "name", label: "Nom complet" },
          {
            key: "fonction",
            label: "Fonction",
            render: (row) => (
              <Badge tone={row.fonction === "Enseignant" ? "blue" : "amber"}>
                {row.fonction}
              </Badge>
            ),
          },
          { key: "phone", label: "Téléphone" },
          { key: "subjects", label: "Matières enseignées" },
          { key: "classes", label: "Classes assignées" },
          {
            key: "status",
            label: "Statut",
            render: (row) => (
              <Badge tone={row.status === "Actif" ? "emerald" : "rose"}>
                {row.status}
              </Badge>
            ),
          },
        ]}
        rows={rows}
        renderActions={(row) => deleteAction(() => handleDelete(row))}
      />
    </>
  );
}

export function PersonnelCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultFonction =
    searchParams.get("fonction") === "direction" ? "Censeur" : "Enseignant";
  const listHref =
    searchParams.get("fonction") === "direction"
      ? "/app/teachers?fonction=direction"
      : "/app/teachers";
  const { rows: subjectRows } = useLoad(
    useCallback(async () => (await api.fetchMatieres()).map(subjectRow), []),
    emptyRows,
  );
  const [form, setForm] = useState({
    ...EMPTY_PERSONNEL,
    fonction: defaultFonction,
  });
  const [notice, setNotice] = useState("");
  const isTeacher = form.fonction === "Enseignant";

  async function submit(event) {
    event.preventDefault();
    try {
      if (isTeacher) {
        const created = await api.createProfesseur({
          nom: form.nom,
          prenom: form.prenom,
          sexe: form.sexe,
          phone: form.phone,
          email: form.email,
          specialite: form.specialite,
          password: form.password,
        });
        if (form.assignment) {
          const [classeId, matiereId] = form.assignment.split(":");
          await api.createAttribution({
            classe_id: Number(classeId),
            matiere_id: Number(matiereId),
            professeur_id: created.id,
          });
        }
      } else {
        if (!form.phone2) {
          setNotice(
            "Un deuxieme telephone est obligatoire pour ce poste (Direction).",
          );
          return;
        }
        await api.createDirection({
          nom: form.nom,
          prenom: form.prenom,
          phone: form.phone,
          phone2: form.phone2,
          fonction: form.fonction,
          email: form.email,
          password: form.password,
        });
      }
      navigate(listHref);
    } catch (err) {
      setNotice(err.message || "Creation impossible.");
    }
  }

  return (
    <>
      <PageHeader
        title="Nouveau membre du personnel"
        breadcrumb="Personnel"
        actions={
          <Link to={listHref}>
            <Button variant="secondary">Retour à la liste</Button>
          </Link>
        }
      />
      <Notice message={notice} tone="rose" />
      <Card className="p-5">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Fonction
            </span>
            <Select
              value={form.fonction}
              onChange={(e) => setForm({ ...form, fonction: e.target.value })}
            >
              <option value="Enseignant">Enseignant</option>
              {STAFF_FUNCTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </label>
          {isTeacher && (
            <Select
              value={form.sexe}
              onChange={(e) => setForm({ ...form, sexe: e.target.value })}
            >
              <option value="M">Masculin</option>
              <option value="F">Feminin</option>
            </Select>
          )}
          <Input
            required
            placeholder="Nom"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
          />
          <Input
            placeholder="Prenom"
            value={form.prenom}
            onChange={(e) => setForm({ ...form, prenom: e.target.value })}
          />
          <Input
            required
            placeholder="Telephone principal"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          {!isTeacher && (
            <Input
              required
              placeholder="Telephone secondaire (obligatoire)"
              value={form.phone2}
              onChange={(e) => setForm({ ...form, phone2: e.target.value })}
            />
          )}
          <Input
            type="email"
            placeholder="Email facultatif"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {isTeacher && (
            <Input
              placeholder="Specialite"
              value={form.specialite}
              onChange={(e) => setForm({ ...form, specialite: e.target.value })}
            />
          )}
          {isTeacher && (
            <Select
              value={form.assignment}
              onChange={(e) => setForm({ ...form, assignment: e.target.value })}
            >
              <option value="">
                Affecter une matière maintenant (facultatif)
              </option>
              {subjectRows
                .filter((subject) => subject.classe_id)
                .map((subject) => (
                  <option
                    key={`${subject.classe_id}:${subject.id}`}
                    value={`${subject.classe_id}:${subject.id}`}
                  >
                    {subject.name} - {subject.className}
                  </option>
                ))}
            </Select>
          )}
          <Input
            required
            type="password"
            placeholder="Mot de passe initial"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <div className="md:col-span-2 flex justify-end gap-2">
            <Link to={listHref}>
              <Button type="button" variant="secondary">
                Annuler
              </Button>
            </Link>
            <Button type="submit">
              <UserPlus size={16} /> Créer
            </Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-slate-400">
          Les censeurs et directeurs d'études peuvent saisir les notes depuis le
          menu Notes.
        </p>
      </Card>
    </>
  );
}
