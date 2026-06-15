import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, Eye, FileText } from "lucide-react";
import * as api from "../../../api/api";
import {
  Badge,
  Button,
  Card,
  DataTable,
  PageHeader,
  Select,
  Textarea,
} from "../../../components/ui";
import { Notice, classNameById, classRow, studentRow, useLoad } from "./shared";

export function BulletinsWorkspace({ professor = false }) {
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
  const [period, setPeriod] = useState("1");
  const scope = period === "annual" ? "annual" : "trimestre";
  const trimestre = period === "annual" ? 3 : Number(period);
  const [students, setStudents] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [selectedBulletin, setSelectedBulletin] = useState(null);
  const [notice, setNotice] = useState("");

  const loadClassData = useCallback(
    async (classId = selectedClass) => {
      if (!classId) return;
      const [nextStudents, nextBulletins] = await Promise.all([
        api
          .getClassEleves(classId)
          .then((data) =>
            data.map((eleve) =>
              studentRow(eleve, {
                [String(classId)]: classNameById(classRows, classId),
              }),
            ),
          )
          .catch(() => []),
        api
          .fetchClasseBulletins(classId, trimestre, scope)
          .then((data) => data.bulletins || data || [])
          .catch(() => []),
      ]);
      setStudents(nextStudents);
      setBulletins(Array.isArray(nextBulletins) ? nextBulletins : []);
    },
    [selectedClass, trimestre, scope, classRows],
  );

  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  async function preview(student) {
    try {
      const data = await api.fetchEleveBulletin(
        student.id,
        trimestre,
        "cameroon",
        scope,
      );
      setSelectedBulletin(data.bulletin || data);
      setNotice("");
    } catch (err) {
      setNotice(err.message || "Generation du bulletin impossible.");
    }
  }

  async function publish(student) {
    try {
      await api.publishEleveBulletin(student.id, trimestre, null, scope);
      setNotice("Bulletin publie avec succes.");
      await loadClassData();
    } catch (err) {
      setNotice(err.message || "Publication du bulletin impossible.");
    }
  }

  const periodLabel = period === "annual" ? "annuel" : `trimestre ${period}`;

  return (
    <>
      <PageHeader title={professor ? "Bulletins de mes eleves" : "Bulletins"} />
      <Notice
        message={notice}
        tone={notice.includes("succes") ? "emerald" : "amber"}
      />
      <Card className="mb-6 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">Classe</option>
            {classRows.map((classe) => (
              <option key={classe.id} value={classe.id}>
                {classe.name}
              </option>
            ))}
          </Select>
          <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="1">Trimestre 1</option>
            <option value="2">Trimestre 2</option>
            <option value="3">Trimestre 3</option>
            <option value="annual">Bulletin annuel</option>
          </Select>
          <Button variant="secondary" onClick={() => loadClassData()}>
            <FileText size={16} /> Charger
          </Button>
        </div>
      </Card>
      <DataTable
        title="Eleves"
        columns={[
          { key: "name", label: "Eleve" },
          { key: "matricule", label: "Matricule" },
          { key: "className", label: "Classe" },
        ]}
        rows={students}
        renderActions={(row) => (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => preview(row)}>
              <Eye size={16} /> Apercu
            </Button>
            {!professor && (
              <Button onClick={() => publish(row)}>
                <CheckCircle2 size={16} /> Publier
              </Button>
            )}
            {!professor && (
              <Button
                variant="secondary"
                onClick={() =>
                  api.exportEleveBulletinPdf(
                    row.id,
                    trimestre,
                    "auto",
                    null,
                    scope,
                  )
                }
              >
                <Download size={16} /> PDF
              </Button>
            )}
          </div>
        )}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-bold">Classement calcule ({periodLabel})</h2>
          <div className="mt-4 space-y-3">
            {bulletins.slice(0, 6).map((item, index) => (
              <div
                key={item.eleve_id || index}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
              >
                <span>
                  {item.eleve || item.nom || `Eleve ${item.eleve_id}`}
                </span>
                <Badge tone="blue">
                  {item.moyenne_generale || item.average || "-"} / 20
                </Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold">Apercu bulletin ({periodLabel})</h2>
          {selectedBulletin ? (
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>
                <strong>Eleve:</strong>{" "}
                {selectedBulletin.eleve ||
                  `${selectedBulletin.nom || ""} ${selectedBulletin.prenom || ""}`}
              </p>
              <p>
                <strong>Moyenne:</strong>{" "}
                {selectedBulletin.moyenne_generale ||
                  selectedBulletin.average ||
                  "-"}{" "}
                / 20
              </p>
              <p>
                <strong>Rang:</strong>{" "}
                {selectedBulletin.rang_general ||
                  selectedBulletin.rang_label ||
                  selectedBulletin.rang ||
                  "-"}
              </p>
              {selectedBulletin.decision && (
                <p>
                  <strong>Decision:</strong> {selectedBulletin.decision}
                </p>
              )}
              <Textarea
                readOnly
                value={JSON.stringify(
                  selectedBulletin.subjects ||
                    selectedBulletin.details_notes ||
                    selectedBulletin.details_matieres ||
                    [],
                  null,
                  2,
                )}
                rows={8}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Selectionnez un eleve pour generer un apercu.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}

export function OperationalBulletinsPage() {
  return <BulletinsWorkspace />;
}
