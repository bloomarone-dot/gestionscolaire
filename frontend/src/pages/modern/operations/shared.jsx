import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Select } from "../../../components/ui";
import { isAnglophone, resolveSubsystemCode } from "../../../utils/section";
import { isValidAccessToken, readStoredAccessToken } from "../../../utils/authToken";

// Helpers partagés par les écrans d'opérations (classes, élèves, personnel,
// matières, notes, bulletins). Extraits de l'ancien SchoolOperations.jsx.

/** Collège / lycée : uniquement Premier cycle et Second cycle (MINESEC). */
function cycleOptionLabel(cycle) {
  const code = cycle?.code || "";
  if (code === "PREMIER") {
    return "Premier cycle (6ème → 3ème · Form 1–5)";
  }
  if (code === "SECOND") {
    return "Second cycle (2nde → Terminale · Lower–Upper Sixth)";
  }
  if (code === "PRIMAIRE") return "École primaire";
  if (code === "CECRL") return "Langues (CECRL)";
  return cycle?.name_fr || cycle?.name || code;
}

function FieldBlock({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-slate-800">{label}</span>
      {hint ? <span className="text-xs font-normal text-slate-500">{hint}</span> : null}
      {children}
    </label>
  );
}

// §4.1 — sélecteurs en cascade (Sous-système → Type → Cycle → Niveau → Série).
// Réutilisé pour la création de classe (§4) et l'inscription élève (§6).
export function CascadeFields({ cascade }) {
  const {
    subsystems,
    types,
    cycles,
    levels,
    series,
    value,
    select,
    hasSeries,
    seriesLoading,
    loadError,
    loading,
  } = cascade;

  return (
    <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
      {loadError ? (
        <p className="md:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {loadError}
        </p>
      ) : null}
      {loading ? (
        <p className="md:col-span-2 text-sm text-slate-500">Chargement du référentiel MINESEC…</p>
      ) : null}

      <FieldBlock
        label="1. Sous-système"
        hint="Langue du système scolaire : Français (Francophone) ou Anglais (Anglophone)."
      >
        <Select
          value={value.subsystem_code}
          onChange={(e) => select("subsystem_code", e.target.value)}
        >
          <option value="">Choisir…</option>
          {subsystems.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </Select>
      </FieldBlock>

      <FieldBlock
        label="2. Type d'enseignement"
        hint="Général (lycée classique) ou Technique (filières professionnelles)."
      >
        <Select
          disabled={!value.subsystem_code}
          value={value.type_code}
          onChange={(e) => select("type_code", e.target.value)}
        >
          <option value="">
            {!value.subsystem_code ? "Choisissez d'abord le sous-système" : "Choisir…"}
          </option>
          {types.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name_fr}
            </option>
          ))}
        </Select>
      </FieldBlock>

      <FieldBlock
        label="3. Cycle"
        hint="Deux cycles seulement : Premier cycle ou Second cycle."
      >
        <Select
          disabled={!value.type_code}
          value={value.cycle_code}
          onChange={(e) => select("cycle_code", e.target.value)}
        >
          <option value="">
            {!value.type_code ? "Choisissez d'abord le type" : "Choisir…"}
          </option>
          {cycles.map((c) => (
            <option key={c.code} value={c.code}>
              {cycleOptionLabel(c)}
            </option>
          ))}
        </Select>
      </FieldBlock>

      <FieldBlock
        label="4. Niveau / classe"
        hint="Exemple : 6ème, 3ème, 2nde, 1ère, Terminale…"
      >
        <Select
          disabled={!value.cycle_code}
          value={value.level_code}
          onChange={(e) => select("level_code", e.target.value)}
        >
          <option value="">
            {!value.cycle_code ? "Choisissez d'abord le cycle" : "Choisir…"}
          </option>
          {levels.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </Select>
      </FieldBlock>

      {(hasSeries || seriesLoading) && (
        <FieldBlock
          label="5. Série / spécialité"
          hint="Obligatoire en 2nde, 1ère et Terminale (ex. C, D, A4). Pas besoin en 6ème–3ème."
        >
          <Select
            disabled={seriesLoading || !hasSeries}
            value={value.series_code}
            onChange={(e) => select("series_code", e.target.value)}
          >
            <option value="">
              {seriesLoading ? "Chargement des séries…" : "Choisir la série…"}
            </option>
            {series.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name_fr}
              </option>
            ))}
          </Select>
        </FieldBlock>
      )}
    </div>
  );
}

export const emptyRows = [];

// Bouton Supprimer pour les lignes de tableau (avec confirmation côté page).
export function deleteAction(onConfirm) {
  return (
    <div className="flex justify-end">
      <Button
        variant="danger"
        className="px-2"
        title="Supprimer"
        onClick={onConfirm}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
}

export function Notice({ message, tone = "emerald" }) {
  if (!message) return null;
  const classesByTone = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div
      className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${classesByTone[tone]}`}
    >
      {message}
    </div>
  );
}

export function useLoad(loader, fallback) {
  // `fallback` (souvent un littéral `[]`) change de référence à chaque rendu :
  // on le garde dans une ref pour ne PAS le mettre en dépendance de `reload`,
  // sinon `reload` (et l'effet) se recréent à chaque rendu → rechargement en
  // boucle → l'écran clignote.
  const fallbackRef = useRef(fallback);
  const [rows, setRows] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fallbackRef.current = fallback;
  }, [fallback]);

  const reload = useCallback(async () => {
    const token = readStoredAccessToken();
    if (!isValidAccessToken(token)) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await loader();
      setRows(Array.isArray(data) && data.length ? data : fallbackRef.current);
      setError("");
    } catch (err) {
      setRows(fallbackRef.current);
      setError(err.message || "Backend indisponible.");
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, setRows, loading, error, reload };
}

export function classNameById(classes, classeId) {
  const found = classes.find(
    (classe) => String(classe.id) === String(classeId),
  );
  return found?.name || found?.nom || found?.nom_personnalise || null;
}

export function studentRow(eleve, classLookup = {}) {
  const classeId = eleve.classe_id || eleve.class_id;
  return {
    id: eleve.id,
    classe_id: classeId ?? null,
    matricule: eleve.matricule || `EL-${eleve.id}`,
    name:
      [eleve.nom, eleve.prenom].filter(Boolean).join(" ") ||
      eleve.name ||
      "Eleve",
    className:
      eleve.classe_nom ||
      eleve.className ||
      eleve.classe?.nom ||
      classLookup[String(classeId)] ||
      "-",
    sexe: eleve.sexe === "F" ? "F" : eleve.sexe === "M" ? "M" : "-",
    parent: eleve.contact_parent || eleve.parent || "-",
    status: eleve.statut || eleve.status || "Inscrit",
  };
}

export function teacherRow(teacher) {
  return {
    id: teacher.id,
    name:
      [teacher.nom, teacher.prenom].filter(Boolean).join(" ") ||
      teacher.name ||
      "Enseignant",
    phone: teacher.phone || "-",
    subjects:
      teacher.specialite ||
      teacher.matieres?.join(", ") ||
      teacher.subjects ||
      "-",
    classes: "-",
    status: teacher.is_active === false ? "Inactif" : "Actif",
  };
}

// Libellés badges référentiel.
export function subsystemLabel(code, fallbackSection) {
  if (code === "ANGLOPHONE") return "Anglophone";
  if (code === "FRANCOPHONE") return "Francophone";
  if (fallbackSection === "anglophone" || String(fallbackSection).toLowerCase().includes("anglo")) {
    return "Anglophone";
  }
  if (fallbackSection === "francophone" || String(fallbackSection).toLowerCase().includes("franco")) {
    return "Francophone";
  }
  return "—";
}
export function typeLabel(code) {
  if (code === "TECHNIQUE") return "Technique";
  if (code === "GENERAL") return "Général";
  return "-";
}

export function classDisplayName(classe) {
  const name = classe.name || classe.nom || classe.nom_personnalise || `Classe ${classe.id}`;
  const code = resolveSubsystemCode(classe);
  const section = subsystemLabel(code, classe.section || classe.specialite_libre);
  return section && section !== "—" ? `${name} — ${section}` : name;
}

export function SectionBanner({ classe, context = "default" }) {
  const code = resolveSubsystemCode(classe);
  if (!code) return null;
  const anglo = isAnglophone(classe);
  const detail =
    context === "import"
      ? anglo
        ? "Tous les élèves importés seront inscrits en section anglophone (bulletin en anglais)."
        : "Tous les élèves importés seront inscrits en section francophone (bulletin en français)."
      : anglo
        ? "Saisie des notes et bulletin en anglais (Form, SEQ, FIRST GROUP…)."
        : "Saisie des notes et bulletin en français (Trimestre, Séq, PREMIER GROUPE…).";
  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${anglo ? "border-cyan-200 bg-cyan-50 text-cyan-900" : "border-violet-200 bg-violet-50 text-violet-900"}`}>
      <strong>Section {anglo ? "anglophone" : "francophone"}</strong>
      {" · "}
      {detail}
      {context !== "import" && (
        <>
          {" "}
          Les matières affichées sont celles de cette classe uniquement.
        </>
      )}
    </div>
  );
}

export function classRow(classe) {
  const code = resolveSubsystemCode(classe);
  return {
    id: classe.id,
    name: classe.nom || classe.nom_personnalise || classe.name,
    subsystem: subsystemLabel(code, classe.specialite_libre || classe.section),
    subsystem_code: code,
    type_code: classe.type_code || null,
    type: typeLabel(classe.type_code),
    cycle_code: classe.cycle_code || null,
    level_code: classe.level_code || classe.niveau || null,
    level:
      classe.niveau ||
      classe.level_code ||
      classe.niveau_libre ||
      classe.level ||
      "-",
    serie: classe.serie || classe.series_code || classe.specialite_libre || "—",
    students: classe.effectif ?? classe.students ?? 0,
    capacity: classe.capacite || classe.effectif_max || "-",
    nb_matieres: classe.nb_matieres ?? 0,
    statut: classe.statut || (classe.is_special ? "Spéciale" : "Standard"),
    prof_principal_id: classe.prof_principal_id ?? null,
  };
}

export function subjectRow(subject, classe = null) {
  return {
    id: subject.id,
    classe_id: subject.classe_id || classe?.id,
    name: subject.nom || subject.name,
    code: subject.code || subject.subject_code || String(subject.id),
    coefficient: subject.coefficient || subject.coefficient_defaut || 1,
    teacher: subject.enseignant_id || subject.teacher || "-",
    className:
      classe?.nom ||
      classe?.nom_personnalise ||
      classe?.name ||
      subject.classe_nom ||
      subject.className ||
      "-",
    status: subject.activated === false ? "Inactive" : "Active",
  };
}

export { STAFF_FUNCTIONS } from "../../../utils/personnelFunctions";

export function personnelRow(p) {
  return {
    id: p.id,
    name: [p.nom, p.prenom].filter(Boolean).join(" ") || "Personnel",
    fonction:
      p.fonction ||
      (p.role_type === "ENSEIGNANT" ? "Enseignant" : "Administration"),
    phone: p.phone || "-",
    status: p.is_active === false ? "Inactif" : "Actif",
  };
}

export const EMPTY_PERSONNEL = {
  fonction: "Enseignant",
  nom: "",
  prenom: "",
  sexe: "M",
  phone: "",
  phone2: "",
  email: "",
  specialite: "",
  password: "",
  assignment: "",
};

// ── Helpers spécifiques aux notes / bulletins ───────────────────────────────
export function sequencesForTrimestre(t) {
  const a = 2 * Number(t) - 1;
  const b = 2 * Number(t);
  return [
    [`sequence_${a}`, `Sequence ${a}`],
    [`sequence_${b}`, `Sequence ${b}`],
  ];
}

export const reportSequences = ["Seq1", "Seq2", "Seq3", "Seq4", "Seq5", "Seq6"];

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function inferCurrentSchoolYear() {
  const now = new Date();
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

export function activeYearFromLocalStorage() {
  try {
    const years = JSON.parse(localStorage.getItem("schoolYears") || "[]");
    if (!Array.isArray(years)) return "";
    const active = years.find(
      (year) => year.statut === "Active" || year.is_active,
    );
    return active?.annee || "";
  } catch {
    return "";
  }
}
