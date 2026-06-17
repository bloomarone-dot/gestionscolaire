import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
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
  deleteAction,
  teacherRow,
  useLoad,
} from "./shared";

export function OperationalClassesPage() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const loadClasses = useCallback(async () => {
    const [classes, eleves] = await Promise.all([
      api.fetchClasses(),
      api.fetchEleves_admin().catch(() => []),
    ]);
    // Effectif réel par classe (cross-service eleves).
    const counts = {};
    eleves.forEach((e) => {
      const c = e.classe_id ?? e.class_id;
      if (c != null) counts[c] = (counts[c] || 0) + 1;
    });
    return classes.map((c) => ({
      ...classRow(c),
      students: counts[c.id] || 0,
    }));
  }, []);
  const { rows, setRows, loading, error } = useLoad(loadClasses, []);
  const { rows: teacherRows } = useLoad(
    useCallback(async () => (await api.fetchProfesseurs()).map(teacherRow), []),
    [],
  );
  const [notice, setNotice] = useState("");

  async function assignProfPrincipal(row, profId) {
    try {
      const updated = await api.setClasseProfPrincipal(row.id, profId);
      setRows((current) =>
        current.map((r) =>
          r.id === row.id
            ? {
                ...r,
                prof_principal_id: updated.prof_principal_id ?? (profId ? Number(profId) : null),
              }
            : r,
        ),
      );
      setNotice(profId ? "Professeur principal assigné." : "Professeur principal retiré.");
    } catch (err) {
      setNotice(err.message || "Impossible d'assigner le professeur principal.");
    }
  }

  async function handleDelete(row) {
    if (
      !window.confirm(
        `Supprimer la classe "${row.name}" ? Les matieres associees seront supprimees.`,
      )
    )
      return;
    try {
      await api.deleteClasse(row.id);
      setRows((current) => current.filter((r) => r.id !== row.id));
    } catch (err) {
      setNotice(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Classes"
        actions={
          <Link to="/app/classes/nouveau">
            <Button>
              <Plus size={16} /> Nouvelle classe
            </Button>
          </Link>
        }
      />
      <Notice
        message={loading ? "Chargement des classes..." : error}
        tone={error ? "amber" : "blue"}
      />
      <Notice message={notice} />
      <DataTable
        title="Classes"
        columns={[
          { key: "name", label: "Classe" },
          {
            key: "subsystem",
            label: "Sous-système",
            render: (row) => (
              <Badge
                tone={row.subsystem_code === "ANGLOPHONE" ? "cyan" : "violet"}
              >
                {row.subsystem}
              </Badge>
            ),
          },
          { key: "type", label: "Type" },
          { key: "level", label: "Niveau" },
          { key: "serie", label: "Série / Spécialité" },
          {
            key: "effectif",
            label: "Effectif",
            render: (row) => `${row.students} / ${row.capacity}`,
          },
          {
            key: "prof_principal_id",
            label: "Prof. principal",
            render: (row) => (
              <Select
                value={String(row.prof_principal_id ?? "")}
                onChange={(e) => assignProfPrincipal(row, e.target.value)}
              >
                <option value="">Aucun</option>
                {teacherRows.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            ),
          },
          { key: "nb_matieres", label: "Matières" },
          {
            key: "statut",
            label: "Statut",
            render: (row) => (
              <Badge tone={row.statut === "Spéciale" ? "amber" : "slate"}>
                {row.statut}
              </Badge>
            ),
          },
        ]}
        rows={rows}
        rowClassName={(row) =>
          String(row.id) === highlightId
            ? "bg-blue-50 ring-1 ring-inset ring-blue-200"
            : "hover:bg-slate-50"
        }
        renderActions={(row) => deleteAction(() => handleDelete(row))}
      />
    </>
  );
}

export function ClasseCreatePage() {
  const navigate = useNavigate();
  const { rows: teacherRows } = useLoad(
    useCallback(async () => (await api.fetchProfesseurs()).map(teacherRow), []),
    [],
  );
  const [form, setForm] = useState({
    nom: "",
    effectif_max: 40,
    prof_principal_id: "",
    niveau_libre: "",
    specialite_libre: "",
  });
  const [special, setSpecial] = useState(false);
  const [notice, setNotice] = useState("");
  const cascade = useReferentielCascade();

  async function submit(event) {
    event.preventDefault();
    if (!special && !cascade.isComplete) {
      setNotice(
        "Veuillez compléter la cascade (sous-système → … → niveau/série).",
      );
      return;
    }
    try {
      const base = {
        nom_personnalise: form.nom,
        effectif_max: form.effectif_max,
        prof_principal_id: form.prof_principal_id
          ? Number(form.prof_principal_id)
          : null,
      };
      const payload = special
        ? {
            ...base,
            is_special: true,
            niveau_libre: form.niveau_libre,
            specialite_libre: form.specialite_libre,
          }
        : { ...base, is_special: false, ...cascade.value };
      await api.createClasse(payload);
      navigate("/app/classes");
    } catch (err) {
      setNotice(err.message || "Creation de classe impossible.");
    }
  }

  return (
    <>
      <PageHeader
        title="Nouvelle classe"
        breadcrumb="Classes"
        actions={
          <Link to="/app/classes">
            <Button variant="secondary">Retour à la liste</Button>
          </Link>
        }
      />
      <Notice message={notice} tone="rose" />
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Informations de la classe</h2>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={special}
              onChange={(e) => setSpecial(e.target.checked)}
            />
            Classe spéciale (hors référentiel MINESEC)
          </label>
        </div>
        <form
          id="class-form"
          className="grid gap-4 md:grid-cols-2"
          onSubmit={submit}
        >
          {special ? (
            <>
              <Input
                required
                placeholder="Niveau (libre)"
                value={form.niveau_libre}
                onChange={(e) =>
                  setForm({ ...form, niveau_libre: e.target.value })
                }
              />
              <Input
                placeholder="Spécialité (libre)"
                value={form.specialite_libre}
                onChange={(e) =>
                  setForm({ ...form, specialite_libre: e.target.value })
                }
              />
            </>
          ) : (
            <CascadeFields cascade={cascade} />
          )}
          <Input
            required
            placeholder="Nom personnalisé (ex. Tle D1)"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
          />
          <Input
            type="number"
            min="1"
            placeholder="Effectif maximum"
            value={form.effectif_max}
            onChange={(e) => setForm({ ...form, effectif_max: e.target.value })}
          />
          <Select
            value={form.prof_principal_id}
            onChange={(e) =>
              setForm({ ...form, prof_principal_id: e.target.value })
            }
          >
            <option value="">Professeur principal (optionnel)</option>
            {teacherRows.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          {special && (
            <p className="md:col-span-2 text-xs text-amber-600">
              Classe hors référentiel : aucune matière n'est pré-remplie.
              Étiquette « Spéciale » appliquée partout.
            </p>
          )}
          <div className="md:col-span-2 flex justify-end gap-2">
            <Link to="/app/classes">
              <Button type="button" variant="secondary">
                Annuler
              </Button>
            </Link>
            <Button type="submit">
              <Plus size={16} /> Créer la classe
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
