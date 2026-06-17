import { useCallback, useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import * as api from "../../../api/api";
import { Button, Card, Input, PageHeader, Select } from "../../../components/ui";
import { Notice, classDisplayName, classRow, SectionBanner, teacherRow, useLoad } from "./shared";

export function OperationalSubjectsPage() {
  const { rows: classRows } = useLoad(
    useCallback(async () => (await api.fetchClasses()).map(classRow), []),
    [],
  );
  const { rows: teacherRows } = useLoad(
    useCallback(async () => (await api.fetchProfesseurs()).map(teacherRow), []),
    [],
  );
  const [selectedClass, setSelectedClass] = useState("");
  const [matieres, setMatieres] = useState([]);
  const [loadingM, setLoadingM] = useState(false);
  const [notice, setNotice] = useState("");
  const [special, setSpecial] = useState({
    nom: "",
    coefficient: 1,
    volume_horaire: "",
  });

  const loadMatieres = useCallback(async (classId) => {
    if (!classId) {
      setMatieres([]);
      return;
    }
    setLoadingM(true);
    try {
      setMatieres(await api.getClassMatieres(classId));
    } catch (err) {
      setMatieres([]);
      setNotice(err.message);
    } finally {
      setLoadingM(false);
    }
  }, []);

  useEffect(() => {
    loadMatieres(selectedClass);
  }, [selectedClass, loadMatieres]);

  async function assignTeacher(m, enseignantId) {
    try {
      await api.updateMatiere(m.id, {
        classe_id: selectedClass,
        enseignant_id: enseignantId ? Number(enseignantId) : null,
      });
      setMatieres((ms) =>
        ms.map((x) =>
          x.id === m.id
            ? {
                ...x,
                enseignant_id: enseignantId ? Number(enseignantId) : null,
              }
            : x,
        ),
      );
      setNotice("Affectation enregistree.");
    } catch (err) {
      setNotice(err.message);
    }
  }

  function changeCoefficient(m, value) {
    setMatieres((ms) =>
      ms.map((x) => (x.id === m.id ? { ...x, coefficient: value } : x)),
    );
  }

  async function saveCoefficient(m) {
    const coefficient = Number(m.coefficient);
    if (!Number.isFinite(coefficient) || coefficient < 0) {
      setNotice("Le coefficient doit etre un nombre positif.");
      return;
    }
    try {
      const updated = await api.updateMatiere(m.id, {
        classe_id: selectedClass,
        coefficient,
      });
      setMatieres((ms) =>
        ms.map((x) =>
          x.id === m.id
            ? { ...x, coefficient: updated.coefficient ?? coefficient }
            : x,
        ),
      );
      setNotice("Coefficient enregistre.");
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function toggleActivated(m) {
    const next = !m.activated;
    if (
      m.activated &&
      m.is_obligatoire &&
      !window.confirm(
        "Attention : cette matiere est obligatoire pour l'examen officiel de cette serie. Si vous la desactivez, elle n'apparaitra plus sur les bulletins ni dans les statistiques d'examen. Continuer ?",
      )
    )
      return;
    try {
      await api.updateMatiere(m.id, {
        classe_id: selectedClass,
        activated: next,
        confirm: true,
      });
      setMatieres((ms) =>
        ms.map((x) => (x.id === m.id ? { ...x, activated: next } : x)),
      );
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function addSpecial(event) {
    event.preventDefault();
    if (!selectedClass || !special.nom) {
      setNotice("Choisissez une classe et un nom de matiere.");
      return;
    }
    try {
      await api.createSpecialMatiere(selectedClass, special);
      setSpecial({ nom: "", coefficient: 1, volume_horaire: "" });
      setNotice("Matiere speciale ajoutee.");
      loadMatieres(selectedClass);
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function saveGroupe(m) {
    const groupe = m.groupe === "" || m.groupe == null ? null : Number(m.groupe);
    if (groupe != null && (!Number.isInteger(groupe) || groupe < 1 || groupe > 3)) {
      setNotice("Le groupe doit etre 1, 2 ou 3.");
      return;
    }
    try {
      const updated = await api.updateMatiere(m.id, {
        classe_id: selectedClass,
        groupe,
      });
      setMatieres((ms) =>
        ms.map((x) =>
          x.id === m.id ? { ...x, groupe: updated.groupe ?? groupe } : x,
        ),
      );
      setNotice("Groupe bulletin enregistre.");
    } catch (err) {
      setNotice(err.message);
    }
  }

  const selectedClassObj = classRows.find(
    (c) => String(c.id) === String(selectedClass),
  );

  return (
    <>
      <PageHeader title="Matieres de la classe" />
      <Notice
        message={notice}
        tone={/enregistree|ajoutee/.test(notice) ? "emerald" : "amber"}
      />
      {selectedClassObj && <SectionBanner classe={selectedClassObj} />}
      <Card className="p-5">
        <label className="block max-w-sm">
          <span className="mb-1 block text-sm font-semibold text-slate-700">
            Classe
          </span>
          <Select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">Choisir une classe...</option>
            {classRows.map((c) => (
              <option key={c.id} value={c.id}>
                {classDisplayName(c)}
              </option>
            ))}
          </Select>
        </label>

        {!selectedClass ? (
          <p className="mt-6 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Selectionnez une classe pour gerer ses matieres.
          </p>
        ) : loadingM ? (
          <p className="mt-6 text-sm text-slate-500">
            Chargement des matieres...
          </p>
        ) : matieres.length === 0 ? (
          <p className="mt-6 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Aucune matiere pour cette classe.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">Matiere</th>
                  <th className="px-4 py-3 text-center">Coef.</th>
                  <th className="px-4 py-3 text-center">Groupe</th>
                  <th className="px-4 py-3 text-center">Activee</th>
                  <th className="px-4 py-3 text-left">Enseignant assigne</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matieres.map((m) => (
                  <tr key={m.id} className={m.activated ? "" : "opacity-50"}>
                    <td className="px-4 py-2 font-semibold">
                      {m.nom}
                      {m.is_obligatoire && (
                        <span
                          className="ml-1 text-rose-500"
                          title="Matiere obligatoire"
                        >
                          *
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        className="mx-auto w-24 text-center"
                        type="number"
                        min="0"
                        step="0.5"
                        value={m.coefficient ?? ""}
                        onChange={(e) => changeCoefficient(m, e.target.value)}
                        onBlur={() => saveCoefficient(m)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Select
                        className="mx-auto w-28 text-center"
                        value={m.groupe ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setMatieres((ms) =>
                            ms.map((x) =>
                              x.id === m.id
                                ? {
                                    ...x,
                                    groupe: value === "" ? null : Number(value),
                                  }
                                : x,
                            ),
                          );
                        }}
                        onBlur={() => saveGroupe(m)}
                      >
                        <option value="">—</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </Select>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!m.activated}
                        onChange={() => toggleActivated(m)}
                        className="h-4 w-4 cursor-pointer accent-blue-600"
                      />
                    </td>
                    <td className="px-4 py-2 w-64">
                      <Select
                        value={String(m.enseignant_id ?? "")}
                        onChange={(e) => assignTeacher(m, e.target.value)}
                      >
                        <option value="">Non assigne</option>
                        {teacherRows.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
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
            <Input
              required
              placeholder="Nom de la matiere"
              value={special.nom}
              onChange={(e) => setSpecial({ ...special, nom: e.target.value })}
            />
            <Input
              type="number"
              min="0"
              step="0.5"
              placeholder="Coefficient"
              value={special.coefficient}
              onChange={(e) =>
                setSpecial({ ...special, coefficient: e.target.value })
              }
            />
            <Input
              type="number"
              min="0"
              placeholder="Volume horaire/sem (optionnel)"
              value={special.volume_horaire}
              onChange={(e) =>
                setSpecial({ ...special, volume_horaire: e.target.value })
              }
            />
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit">
                <BookOpen size={16} /> Ajouter la matiere
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

// Séquences d'un trimestre : T1 → Séq 1 & 2, T2 → Séq 3 & 4, T3 → Séq 5 & 6.
