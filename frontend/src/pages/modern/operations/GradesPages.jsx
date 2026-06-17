import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, Printer } from "lucide-react";
import * as api from "../../../api/api";
import { Badge, Button, Card, Input, PageHeader, Select } from "../../../components/ui";
import {
  Notice,
  activeYearFromLocalStorage,
  classDisplayName,
  classNameById,
  classRow,
  escapeHtml,
  inferCurrentSchoolYear,
  reportSequences,
  SectionBanner,
  sequencesForTrimestre,
  studentRow,
  subjectRow,
  useLoad,
} from "./shared";

export function GradesWorkspace({ professor = false }) {
  const loadClasses = useCallback(
    async () =>
      (professor
        ? await api.getProfessorClasses()
        : await api.fetchClasses()
      ).map(classRow),
    [professor],
  );
  const { rows: classRows } = useLoad(loadClasses, []);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [trimestre, setTrimestre] = useState(1);
  const [typeEvaluation, setTypeEvaluation] = useState("sequence_1");
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [values, setValues] = useState({});
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [entryOpen, setEntryOpen] = useState(null);
  const [schoolYear, setSchoolYear] = useState(
    () => activeYearFromLocalStorage() || inferCurrentSchoolYear(),
  );

  const seqOptions = sequencesForTrimestre(trimestre);

  useEffect(() => {
    let active = true;
    api
      .fetchAnneesScolaires()
      .then((years) => {
        if (!active || !Array.isArray(years)) return;
        const current =
          years.find((year) => year.is_active || year.statut === "Active") ||
          years[0];
        if (current?.annee) setSchoolYear(current.annee);
      })
      .catch(() => {
        if (active)
          setSchoolYear(
            activeYearFromLocalStorage() || inferCurrentSchoolYear(),
          );
      });
    return () => {
      active = false;
    };
  }, []);

  // Changement de trimestre → recadre la séquence sur celles du trimestre.
  function changeTrimestre(t) {
    setTrimestre(t);
    setTypeEvaluation(`sequence_${2 * Number(t) - 1}`);
  }

  // Charge élèves + matières de la classe.
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setSubjects([]);
      setSelectedSubject("");
      return;
    }
    Promise.all([
      api
        .getClassEleves(selectedClass)
        .then((data) =>
          data.map((eleve) =>
            studentRow(eleve, {
              [String(selectedClass)]: classNameById(classRows, selectedClass),
            }),
          ),
        )
        .catch(() => []),
      api
        .getClassMatieres(selectedClass)
        .then((data) => data.map(subjectRow))
        .catch(() => []),
    ]).then(([nextStudents, nextSubjects]) => {
      setStudents(nextStudents);
      setSubjects(nextSubjects);
      setSelectedSubject(nextSubjects[0]?.id ? String(nextSubjects[0].id) : "");
    });
  }, [selectedClass, classRows]);

  // Statut de la fenêtre de saisie (délais) pour la classe/matière sélectionnée.
  useEffect(() => {
    if (!selectedClass || !selectedSubject) {
      setEntryOpen(null);
      return;
    }
    let active = true;
    api
      .verifierPeriodeSaisie(selectedClass, selectedSubject)
      .then((r) => {
        if (active) setEntryOpen(r?.open !== false);
      })
      .catch(() => {
        if (active) setEntryOpen(true);
      });
    return () => {
      active = false;
    };
  }, [selectedClass, selectedSubject]);

  // Préremplit avec les notes déjà saisies pour (classe, matière, trimestre, séquence).
  useEffect(() => {
    if (!selectedClass || !selectedSubject) {
      setValues({});
      return;
    }
    let active = true;
    api
      .fetchNotes({
        classe_id: Number(selectedClass),
        matiere_id: Number(selectedSubject),
        trimestre: Number(trimestre),
        type_evaluation: typeEvaluation,
      })
      .then((notes) => {
        if (!active) return;
        const map = {};
        (Array.isArray(notes) ? notes : []).forEach((n) => {
          map[n.eleve_id] = n.valeur;
        });
        setValues(map);
      })
      .catch(() => {
        if (active) setValues({});
      });
    return () => {
      active = false;
    };
  }, [selectedClass, selectedSubject, trimestre, typeEvaluation]);

  async function submit(event) {
    event.preventDefault();
    const notes = students
      .map((student) => ({
        eleve_id: Number(student.id),
        valeur: Number(values[student.id]),
      }))
      .filter(
        (item) =>
          Number.isFinite(item.valeur) && item.valeur >= 0 && item.valeur <= 20,
      );
    if (!selectedClass || !selectedSubject || !notes.length) {
      setNotice(
        "Selectionnez une classe, une matiere et saisissez au moins une note (0 a 20).",
      );
      return;
    }
    setSaving(true);
    setNotice("");
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
      setNotice(err.message || "Saisie des notes impossible.");
    } finally {
      setSaving(false);
    }
  }

  const subjectName = subjects.find(
    (s) => String(s.id) === String(selectedSubject),
  )?.name;
  const selectedClassName = classNameById(classRows, selectedClass) || "";
  const selectedClassObj = classRows.find(
    (c) => String(c.id) === String(selectedClass),
  );

  function printGradeReportSheet() {
    if (!selectedClass || !selectedSubject || !students.length) {
      setNotice(
        "Selectionnez une classe, une matiere et chargez les eleves avant impression.",
      );
      return;
    }
    const rows = students
      .map(
        (student, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${escapeHtml(student.matricule)}</td>
        <td>${escapeHtml(student.name)}</td>
        ${reportSequences.map(() => '<td class="note"></td>').join("")}
      </tr>
    `,
      )
      .join("");
    const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Fiche de report des notes - ${escapeHtml(selectedClassName)} - ${escapeHtml(subjectName)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #0f172a; font-family: Arial, sans-serif; font-size: 12px; }
    .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
    .brand { font-size: 18px; font-weight: 800; }
    .subtitle { margin-top: 4px; color: #475569; }
    .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 24px; margin-bottom: 14px; }
    .meta div { border: 1px solid #cbd5e1; padding: 8px; min-height: 34px; }
    .meta strong { display: inline-block; min-width: 92px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #334155; padding: 7px 6px; height: 32px; vertical-align: middle; }
    th { background: #e2e8f0; font-weight: 800; text-align: center; }
    .rank { width: 36px; text-align: center; }
    .note { width: 72px; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 24px; }
    .sign { border-top: 1px solid #334155; padding-top: 6px; text-align: center; min-height: 42px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">FICHE DE REPORT DES NOTES</div>
      <div class="subtitle">Document remis au professeur puis depose chez le censeur pour saisie.</div>
    </div>
    <div>Date d'impression : ${new Date().toLocaleDateString("fr-FR")}</div>
  </div>
  <div class="meta">
    <div><strong>Classe :</strong> ${escapeHtml(selectedClassName)}</div>
    <div><strong>Matiere :</strong> ${escapeHtml(subjectName)}</div>
    <div><strong>Professeur :</strong> ................................................</div>
    <div><strong>Annee scolaire :</strong> ${escapeHtml(schoolYear)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th class="rank">N°</th>
        <th>Matricule</th>
        <th>Nom et prenom de l'eleve</th>
        ${reportSequences.map((seq) => `<th class="note">${seq}</th>`).join("")}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <div class="sign">Signature professeur</div>
    <div class="sign">Visa censeur</div>
    <div class="sign">Date de depot</div>
  </div>
  <script>window.addEventListener('load', () => { window.print(); });</script>
</body>
</html>`;
    const printWindow = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=1200,height=800",
    );
    if (!printWindow) {
      setNotice("Le navigateur a bloque la fenetre d'impression.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <>
      <PageHeader title={professor ? "Mes notes" : "Saisie des notes"} />
      <Notice
        message={notice}
        tone={notice.includes("succes") ? "emerald" : "amber"}
      />
      {selectedClassObj && <SectionBanner classe={selectedClassObj} />}
      <Card className="p-5">
        <form id="grades-form" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Classe
              </span>
              <Select
                required
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">Choisir...</option>
                {classRows.map((classe) => (
                  <option key={classe.id} value={classe.id}>
                    {classDisplayName(classe)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Matiere
              </span>
              <Select
                required
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={!subjects.length}
              >
                <option value="">Choisir...</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Trimestre
              </span>
              <Select
                value={trimestre}
                onChange={(e) => changeTrimestre(e.target.value)}
              >
                <option value="1">Trimestre 1</option>
                <option value="2">Trimestre 2</option>
                <option value="3">Trimestre 3</option>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Sequence
              </span>
              <Select
                value={typeEvaluation}
                onChange={(e) => setTypeEvaluation(e.target.value)}
              >
                {seqOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {selectedSubject && entryOpen !== null && (
            <div className="mt-4">
              {entryOpen ? (
                <Badge tone="emerald">Saisie ouverte</Badge>
              ) : (
                <Badge tone="rose">
                  Saisie fermee (delai depasse pour cette classe/matiere)
                </Badge>
              )}
            </div>
          )}

          {!selectedClass ? (
            <p className="mt-6 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Selectionnez une classe pour afficher les eleves.
            </p>
          ) : students.length === 0 ? (
            <p className="mt-6 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Aucun eleve dans cette classe.
            </p>
          ) : (
            <>
              <p className="mt-5 text-sm text-slate-500">
                {students.length} eleve(s)
                {subjectName ? ` - ${subjectName}` : ""}
              </p>
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Matricule</th>
                      <th className="px-4 py-3 text-left">Eleve</th>
                      <th className="px-4 py-3 text-left">Note / 20</th>
                      <th className="px-4 py-3 text-right">Bulletin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-2 text-slate-500">
                          {student.matricule}
                        </td>
                        <td className="px-4 py-2 font-semibold">
                          {student.name}
                        </td>
                        <td className="px-4 py-2 w-32">
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            step="0.25"
                            placeholder="-"
                            value={values[student.id] ?? ""}
                            onChange={(e) =>
                              setValues((v) => ({
                                ...v,
                                [student.id]: e.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            className="px-2"
                            title="Apercu / PDF du bulletin"
                            onClick={() =>
                              api
                                .exportEleveBulletinPdf(
                                  student.id,
                                  Number(trimestre),
                                )
                                .catch((err) => setNotice(err.message))
                            }
                          >
                            <Download size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 flex items-center justify-end gap-3">
                {entryOpen === false && (
                  <span className="text-sm text-rose-600">
                    Saisie fermee pour cette classe/matiere.
                  </span>
                )}
                <Button type="submit" disabled={saving || entryOpen === false}>
                  <CheckCircle2 size={16} />{" "}
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Card>
      {!professor && (
        <Card className="mt-6 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">Fiche de report de notes</h2>
              <p className="mt-1 text-sm text-slate-500">
                Imprimez une fiche par classe et matiere avec les eleves, les
                colonnes Seq1 a Seq6 et l'annee scolaire en cours.
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Annee scolaire: {schoolYear}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={!selectedClass || !selectedSubject || !students.length}
              onClick={printGradeReportSheet}
            >
              <Printer size={16} /> Imprimer la fiche
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}

export function OperationalGradesPage() {
  return <GradesWorkspace />;
}
