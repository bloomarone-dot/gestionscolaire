import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRightLeft, Download, FileUp, Trash2, UserPlus } from "lucide-react";
import * as api from "../../../api/api";
import LanguageCenterEnrollmentFields, {
  buildLanguageCenterEnrollmentCodes,
} from "../../../components/languageCenter/LanguageCenterEnrollmentFields";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  Modal,
  PageHeader,
  Select,
} from "../../../components/ui";
import { useEstablishmentProfile } from "../../../hooks/useEstablishmentProfile";
import { useReferentielCascade } from "../../../hooks/useReferentielCascade";
import {
  CascadeFields,
  Notice,
  SectionBanner,
  classDisplayName,
  classRow,
  studentRow,
  useLoad,
} from "./shared";

export function OperationalStudentsPage() {
  const { labels: ui, isLanguageCenter } = useEstablishmentProfile();
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
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importClasseId, setImportClasseId] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [filterClasseId, setFilterClasseId] = useState("");

  const classRows = allClasses.map(classRow);
  const importClassObj = classRows.find(
    (c) => String(c.id) === String(importClasseId),
  );

  function openImportModal() {
    if (filterClasseId) setImportClasseId(filterClasseId);
    setShowImport(true);
  }

  useEffect(() => {
    api
      .fetchClasses()
      .then(setAllClasses)
      .catch(() => setAllClasses([]));
  }, []);

  // Groupes éligibles au transfert : même niveau CECRL (centre) ou même niveau/série (école).
  function eligibleFor(student) {
    const cur = allClasses.find(
      (c) => String(c.id) === String(student.classe_id),
    );
    if (!cur)
      return allClasses.filter(
        (c) => String(c.id) !== String(student.classe_id),
      );
    if (isLanguageCenter) {
      return allClasses.filter(
        (c) =>
          c.level_code === cur.level_code &&
          String(c.id) !== String(student.classe_id),
      );
    }
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

  async function handleImport() {
    if (!importClasseId) {
      setNotice("Choisissez la classe du fichier (ex. Form 4, Terminal A).");
      return;
    }
    if (!importFile) {
      setNotice("Choisissez un fichier Excel (.xlsx) ou CSV (.csv).");
      return;
    }
    try {
      setImportLoading(true);
      setNotice("");
      const result = await api.importElevesFile(
        importFile,
        Number(importClasseId),
      );
      const sectionHint = result.section ? ` (${result.section})` : "";
      const summary = `${result.imported} créé(s), ${result.updated} mis à jour dans ${result.classe_nom || "la classe"}${sectionHint}`;
      const errHint =
        result.errors?.length > 0
          ? ` — ${result.errors.length} avertissement(s) : ${result.errors.slice(0, 3).join(" ; ")}`
          : "";
      setNotice(`${summary}${errHint}`);
      setShowImport(false);
      setImportFile(null);
      const refreshed = await loadStudents();
      setRows(refreshed);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setImportLoading(false);
    }
  }

  const displayedRows = filterClasseId
    ? rows.filter((r) => String(r.classe_id) === filterClasseId)
    : rows;

  return (
    <>
      <PageHeader
        title={ui.studentsList}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => api.downloadElevesImportTemplate(importClasseId || filterClasseId || null)}>
              <Download size={16} /> Modèle Excel
            </Button>
            <Button variant="secondary" onClick={openImportModal}>
              <FileUp size={16} /> Importer
            </Button>
            <Button
              variant="secondary"
              onClick={() => api.exportEleves("xlsx", filterClasseId || null)}
            >
              <Download size={16} /> Exporter Excel
            </Button>
            <Link to="/app/students/nouveau">
              <Button>
                <UserPlus size={16} /> {ui.newStudent}
              </Button>
            </Link>
          </div>
        }
      />
      <Notice
        message={loading ? `Chargement des ${ui.students.toLowerCase()}...` : error}
        tone={error ? "amber" : "blue"}
      />
      <Notice message={notice} />
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="text-sm font-semibold text-slate-700">
            Filtrer par {isLanguageCenter ? "groupe" : "classe"}
          </label>
          <Select
            className="md:w-72"
            value={filterClasseId}
            onChange={(e) => setFilterClasseId(e.target.value)}
          >
            <option value="">{isLanguageCenter ? "Tous les groupes" : "Toutes les classes"}</option>
            {allClasses.map((c) => {
              const row = classRow(c);
              return (
                <option key={c.id} value={String(c.id)}>
                  {classDisplayName(row)}
                </option>
              );
            })}
          </Select>
          {!isLanguageCenter && (
            <p className="text-xs text-slate-500">
              Un fichier Excel par classe (Form 4, Terminal A…). La section franco ou anglo est détectée automatiquement.
            </p>
          )}
        </div>
      </Card>
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
              <option value="">{isLanguageCenter ? "Groupe de destination (même niveau)…" : "Classe de destination (même niveau)…"}</option>
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
        title={isLanguageCenter ? `Registre des ${ui.students.toLowerCase()}` : "Registre des élèves"}
        columns={[
          { key: "matricule", label: "Matricule" },
          { key: "name", label: "Nom complet" },
          {
            key: "className",
            label: isLanguageCenter ? ui.class : "Classe",
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
          ...(!isLanguageCenter
            ? [{ key: "parent", label: "Contact parent" }]
            : [{ key: "parent", label: "Contact / tuteur" }]),
          {
            key: "status",
            label: "Statut",
            render: (row) => <Badge tone="emerald">{row.status}</Badge>,
          },
        ]}
        rows={displayedRows}
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
      <Modal
        title="Importer une liste d'élèves"
        open={showImport}
        onClose={() => !importLoading && setShowImport(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={importLoading}
              onClick={() => setShowImport(false)}
            >
              Annuler
            </Button>
            <Button disabled={importLoading || !importFile || !importClasseId} onClick={handleImport}>
              {importLoading ? "Import..." : "Importer la liste"}
            </Button>
          </div>
        }
      >
        <p className="mb-4 text-sm text-slate-600">
          <strong>Un fichier = une classe.</strong> Choisissez la classe (Form 4, Terminal A…),
          téléchargez le modèle adapté, remplissez la liste des élèves puis importez.
          La section francophone ou anglophone est détectée automatiquement à partir de la classe.
        </p>
        <div className="grid gap-4">
          <label className="block text-sm font-semibold text-slate-700">
            Classe du fichier
            <Select
              className="mt-1"
              required
              value={importClasseId}
              onChange={(e) => setImportClasseId(e.target.value)}
            >
              <option value="">Choisir la classe…</option>
              {classRows.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {classDisplayName(c)}
                </option>
              ))}
            </Select>
          </label>
          {importClassObj && <SectionBanner classe={importClassObj} context="import" />}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!importClasseId}
              onClick={() => api.downloadElevesImportTemplate(importClasseId)}
            >
              <Download size={16} /> Télécharger le modèle pour cette classe
            </Button>
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            Fichier (.xlsx ou .csv)
            <Input
              className="mt-1"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>
      </Modal>
    </>
  );
}

export function EleveCreatePage() {
  const navigate = useNavigate();
  const { labels: ui, isLanguageCenter } = useEstablishmentProfile();
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
  const [lcLevel, setLcLevel] = useState("");
  const [notice, setNotice] = useState("");
  const cascade = useReferentielCascade();
  const [filteredClasses, setFilteredClasses] = useState([]);

  // §6 étape 5 : ne proposer que les classes correspondant exactement au profil choisi.
  useEffect(() => {
    if (isLanguageCenter) return;
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
    isLanguageCenter,
    cascade.isComplete,
    cascade.value.subsystem_code,
    cascade.value.type_code,
    cascade.value.level_code,
    cascade.value.series_code,
  ]);

  async function submit(event) {
    event.preventDefault();
    if (isLanguageCenter) {
      if (!lcLevel) {
        setNotice("Choisissez le niveau CECRL visé.");
        return;
      }
      if (!form.classe_id) {
        setNotice("Choisissez le groupe d'inscription.");
        return;
      }
      try {
        await api.createEleve_admin({
          nom: form.nom,
          prenom: form.prenom || null,
          matricule: form.matricule || null,
          sexe: form.sexe || null,
          ...buildLanguageCenterEnrollmentCodes(lcLevel),
          classe_id: Number(form.classe_id),
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
        setNotice(err.message || "Inscription impossible.");
      }
      return;
    }
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
        title={ui.newStudent}
        breadcrumb={ui.enrollment}
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

          {isLanguageCenter ? (
            <LanguageCenterEnrollmentFields
              levelCode={lcLevel}
              groupeId={form.classe_id}
              onLevelChange={setLcLevel}
              onGroupeChange={(id) => setForm((f) => ({ ...f, classe_id: id }))}
            />
          ) : (
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
          )}

          <Input
            placeholder={isLanguageCenter ? "Contact / tuteur (optionnel)" : "Nom parent/tuteur"}
            value={form.parent_nom}
            onChange={(e) => setForm({ ...form, parent_nom: e.target.value })}
          />
          <Input
            placeholder={isLanguageCenter ? "Téléphone apprenant ou tuteur" : "Téléphone parent (obligatoire)"}
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
              <UserPlus size={16} /> {isLanguageCenter ? "Inscrire l'apprenant" : "Inscrire l'élève"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
