import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import * as api from "../../../api/api";
import LanguageCenterGroupFields from "../../../components/languageCenter/LanguageCenterGroupFields";
import PrimarySchoolGroupFields from "../../../components/primarySchool/PrimarySchoolGroupFields";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  PageHeader,
  Select,
} from "../../../components/ui";
import { useEstablishmentProfile } from "../../../hooks/useEstablishmentProfile";
import { useReferentielCascade } from "../../../hooks/useReferentielCascade";
import { buildLanguageCenterClassPayload } from "../../../utils/languageCenter";
import { buildPrimaryClassPayload, PS_SUBSYSTEM_FR } from "../../../utils/primarySchool";
import {
  CascadeFields,
  Notice,
  classRow,
  deleteAction,
  teacherRow,
  useLoad,
} from "./shared";

const emptyLcGroupForm = {
  langue: "DE",
  level_code: "",
  creneau: "",
  nom: "",
  nomTouched: false,
  effectif_max: 20,
  prof_principal_id: "",
};

const emptyPsForm = {
  section: PS_SUBSYSTEM_FR,
  level_code: "",
  suffix: "",
  nom: "",
  nomTouched: false,
  effectif_max: 35,
  prof_principal_id: "",
};

export function OperationalClassesPage() {
  const { labels: ui, isLanguageCenter, isPrimarySchool } = useEstablishmentProfile();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [sectionFilter, setSectionFilter] = useState("");
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
        title={ui.classes}
        actions={
          <Link to="/app/classes/nouveau">
            <Button>
              <Plus size={16} /> {isLanguageCenter ? "Nouveau groupe" : "Nouvelle classe"}
            </Button>
          </Link>
        }
      />
      <Notice
        message={loading ? `Chargement des ${ui.classes.toLowerCase()}...` : error}
        tone={error ? "amber" : "blue"}
      />
      <Notice message={notice} />
      {!isLanguageCenter && (
        <Card className="mb-4 p-4">
          <label className="block max-w-xs">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              {isPrimarySchool ? "Filtrer par section" : "Filtrer par section"}
            </span>
            <Select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
              <option value="">Toutes les sections</option>
              <option value="FRANCOPHONE">Francophone</option>
              <option value="ANGLOPHONE">Anglophone</option>
            </Select>
          </label>
        </Card>
      )}
      <DataTable
        title={ui.classes}
        columns={[
          { key: "name", label: isLanguageCenter ? "Groupe" : "Classe" },
          ...(isLanguageCenter
            ? [
                { key: "level", label: "Niveau CECRL" },
                { key: "type", label: "Parcours", render: () => "Langues" },
              ]
            : isPrimarySchool
              ? [
                  {
                    key: "subsystem",
                    label: "Section",
                    render: (row) => (
                      <Badge tone={row.subsystem_code === "ANGLOPHONE" ? "cyan" : "violet"}>
                        {row.subsystem}
                      </Badge>
                    ),
                  },
                  { key: "level", label: "Niveau" },
                ]
              : [
                {
                  key: "subsystem",
                  label: "Section",
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
              ]),
          {
            key: "effectif",
            label: "Effectif",
            render: (row) => `${row.students} / ${row.capacity}`,
          },
          {
            key: "prof_principal_id",
            label: isLanguageCenter ? "Formateur référent" : isPrimarySchool ? "Enseignant titulaire" : "Prof. principal",
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
          { key: "nb_matieres", label: isLanguageCenter ? "Modules" : "Matières" },
          ...(!isLanguageCenter && !isPrimarySchool
            ? [{
                key: "statut",
                label: "Statut",
                render: (row) => (
                  <Badge tone={row.statut === "Spéciale" ? "amber" : "slate"}>
                    {row.statut}
                  </Badge>
                ),
              }]
            : []),
        ]}
        rows={rows.filter((row) => isLanguageCenter || !sectionFilter || row.subsystem_code === sectionFilter)}
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
  const { labels: ui, isLanguageCenter, isPrimarySchool } = useEstablishmentProfile();
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
  const [lcForm, setLcForm] = useState(emptyLcGroupForm);
  const [psForm, setPsForm] = useState(emptyPsForm);
  const [special, setSpecial] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const cascade = useReferentielCascade({
    // Collège / lycée : pas de cycle primaire ni CECRL dans cette fiche.
    excludeCycleCodes: isPrimarySchool || isLanguageCenter ? null : ["PRIMAIRE", "CECRL"],
  });

  async function submit(event) {
    event.preventDefault();
    setNotice("");
    if (isLanguageCenter) {
      if (!lcForm.level_code) {
        setNotice("Choisissez le niveau CECRL (A1, A2, B1…).");
        return;
      }
      if (!lcForm.nom.trim()) {
        setNotice("Indiquez le nom du groupe.");
        return;
      }
      try {
        await api.createClasse(buildLanguageCenterClassPayload({
          nom_personnalise: lcForm.nom.trim(),
          level_code: lcForm.level_code,
          effectif_max: Number(lcForm.effectif_max) || 20,
          prof_principal_id: lcForm.prof_principal_id,
        }));
        navigate("/app/classes");
      } catch (err) {
        setNotice(err.message || "Création du groupe impossible.");
      }
      return;
    }
    if (isPrimarySchool) {
      if (!psForm.level_code) {
        setNotice("Choisissez le niveau (SIL, CP, CE1…).");
        return;
      }
      if (!psForm.nom.trim()) {
        setNotice("Indiquez le nom de la classe.");
        return;
      }
      try {
        await api.createClasse(buildPrimaryClassPayload({
          nom_personnalise: psForm.nom.trim(),
          level_code: psForm.level_code,
          subsystem_code: psForm.section,
          effectif_max: Number(psForm.effectif_max) || 35,
          prof_principal_id: psForm.prof_principal_id,
        }));
        navigate("/app/classes");
      } catch (err) {
        setNotice(err.message || "Création de la classe impossible.");
      }
      return;
    }
    if (!special && !cascade.isComplete) {
      setNotice(
        cascade.missingStepMessage?.()
          || "Complétez les listes dans l'ordre : sous-système → type → cycle → niveau → série.",
      );
      return;
    }
    if (!special && !form.nom.trim()) {
      setNotice("Indiquez un nom de classe visible (ex. « 6ème A » ou « Tle D1 »).");
      return;
    }
    if (special && !form.niveau_libre.trim()) {
      setNotice("Pour une classe spéciale, indiquez le niveau libre.");
      return;
    }
    if (special && !form.nom.trim()) {
      setNotice("Indiquez un nom de classe.");
      return;
    }
    setSaving(true);
    try {
      const base = {
        nom_personnalise: form.nom.trim(),
        effectif_max: Number(form.effectif_max) || 40,
        prof_principal_id: form.prof_principal_id
          ? Number(form.prof_principal_id)
          : null,
      };
      const payload = special
        ? {
            ...base,
            is_special: true,
            niveau_libre: form.niveau_libre.trim(),
            specialite_libre: form.specialite_libre.trim() || null,
          }
        : { ...base, is_special: false, ...cascade.value };
      await api.createClasse(payload);
      navigate("/app/classes");
    } catch (err) {
      setNotice(err.message || "Création de classe impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={isLanguageCenter ? "Nouveau groupe" : "Nouvelle classe"}
        breadcrumb={ui.classes}
        actions={
          <Link to="/app/classes">
            <Button variant="secondary">Retour à la liste</Button>
          </Link>
        }
      />
      <Notice message={notice} tone="rose" />
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-bold">
            {isLanguageCenter ? "Informations du groupe" : "Informations de la classe"}
          </h2>
          {!isLanguageCenter && !isPrimarySchool && (
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={special}
                onChange={(e) => setSpecial(e.target.checked)}
              />
              Classe spéciale (hors MINESEC)
            </label>
          )}
        </div>
        {!isLanguageCenter && !isPrimarySchool && !special && (
          <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
            <p className="font-bold">Comment créer une classe (collège ou lycée) ?</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sky-900">
              <li>
                <strong>Sous-système</strong> = Francophone ou Anglophone.
              </li>
              <li>
                <strong>Type</strong> = Général ou Technique.
              </li>
              <li>
                <strong>Cycle</strong> = seulement deux choix : <em>Premier cycle</em> ou{" "}
                <em>Second cycle</em> (valable collège comme lycée).
              </li>
              <li>
                <strong>Niveau</strong> = la classe exacte (6ème, 3ème, 2nde, Terminale…).
              </li>
              <li>
                <strong>Série</strong> = surtout au second cycle (C, D, A4…) ; souvent pas au premier cycle.
              </li>
            </ul>
            <p className="mt-2 text-xs text-sky-800">
              Remplissez les listes <strong>dans l&apos;ordre</strong>. Le bouton reste grisé tant que
              tout n&apos;est pas choisi. Ensuite donnez un nom local (ex. « Tle D1 »).
            </p>
          </div>
        )}
        <form
          id="class-form"
          className="grid gap-4 md:grid-cols-2"
          onSubmit={submit}
        >
          {isLanguageCenter ? (
            <LanguageCenterGroupFields
              form={lcForm}
              onChange={setLcForm}
              onSuggestName={(name) => setLcForm((current) => (
                current.nomTouched ? current : { ...current, nom: name }
              ))}
              teacherOptions={teacherRows}
            />
          ) : isPrimarySchool ? (
            <PrimarySchoolGroupFields
              form={psForm}
              onChange={setPsForm}
              onSuggestName={(name) => setPsForm((current) => (
                current.nomTouched ? current : { ...current, nom: name }
              ))}
              teacherOptions={teacherRows}
            />
          ) : special ? (
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
          {!isLanguageCenter && !isPrimarySchool && (
            <>
              <label className="flex flex-col gap-1.5 text-sm md:col-span-2">
                <span className="font-semibold text-slate-800">Nom affiché de la classe</span>
                <span className="text-xs text-slate-500">
                  C&apos;est le nom que voient les enseignants (ex. « 6ème A », « Tle D1 »).
                </span>
                <Input
                  required
                  placeholder="Ex. 6ème A ou Tle D1"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
              </label>
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
            </>
          )}
          {special && !isLanguageCenter && (
            <p className="md:col-span-2 text-xs text-amber-600">
              Classe hors référentiel : aucune matière n&apos;est pré-remplie.
              Étiquette « Spéciale » appliquée partout.
            </p>
          )}
          {!special && !isLanguageCenter && !isPrimarySchool && !cascade.isComplete && (
            <p className="md:col-span-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              {cascade.missingStepMessage?.() || "Complétez les listes ci-dessus avant de créer."}
            </p>
          )}
          <div className="md:col-span-2 flex justify-end gap-2">
            <Link to="/app/classes">
              <Button type="button" variant="secondary">
                Annuler
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={
                saving
                || (
                  !isLanguageCenter
                  && !isPrimarySchool
                  && !special
                  && !cascade.isComplete
                )
              }
            >
              <Plus size={16} />{" "}
              {saving
                ? "Création…"
                : isLanguageCenter
                  ? "Créer le groupe"
                  : "Créer la classe"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
