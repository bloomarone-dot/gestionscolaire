import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, Eye, FileText } from "lucide-react";
import * as api from "../../../api/api";
import BulletinPreviewModal from "../../../components/BulletinPreviewModal";
import "../../../styles/bulletin-detail.css";
import {
  Badge,
  Button,
  Card,
  DataTable,
  PageHeader,
  Select,
} from "../../../components/ui";
import { Notice, classDisplayName, classNameById, classRow, SectionBanner, studentRow, useLoad } from "./shared";

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
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
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
      setSelectedBulletin(data);
      setSelectedStudentId(student.id);
      setPreviewOpen(true);
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
  const selectedClassObj = classRows.find(
    (c) => String(c.id) === String(selectedClass),
  );

  return (
    <>
      <PageHeader title={professor ? "Bulletins de mes eleves" : "Bulletins"} />
      <Notice
        message={notice}
        tone={notice.includes("succes") ? "emerald" : "amber"}
      />
      {selectedClassObj && <SectionBanner classe={selectedClassObj} />}
      <Card className="mb-6 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">Classe</option>
            {classRows.map((classe) => (
              <option key={classe.id} value={classe.id}>
                {classDisplayName(classe)}
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
          {
            key: "section",
            label: "Section",
            render: () => (
              <Badge tone={selectedClassObj?.subsystem_code === "ANGLOPHONE" ? "cyan" : "violet"}>
                {selectedClassObj?.subsystem || "—"}
              </Badge>
            ),
          },
        ]}
        rows={students}
        onRowClick={(row) => preview(row)}
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
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
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
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-bold">Apercu bulletin ({periodLabel})</h2>
          <p className="mt-3 text-sm text-slate-600">
            Cliquez sur un eleve dans la liste pour afficher son bulletin officiel
            (meme format, couleurs et texte que le modele Royal Priesthood).
          </p>
          {selectedBulletin && (
            <p className="mt-2 text-sm font-medium text-slate-800">
              Dernier apercu : {selectedBulletin.eleve || selectedBulletin.eleve_nom}
              {selectedBulletin.classe ? ` — ${selectedBulletin.classe}` : ""}
            </p>
          )}
        </Card>
      </div>
      <BulletinPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        bulletin={selectedBulletin}
        exporting={exportingPdf}
        onExportPdf={
          !professor && selectedStudentId
            ? async () => {
                setExportingPdf(true);
                try {
                  await api.exportEleveBulletinPdf(
                    selectedStudentId,
                    trimestre,
                    "auto",
                    null,
                    scope,
                  );
                } finally {
                  setExportingPdf(false);
                }
              }
            : undefined
        }
      />
    </>
  );
}

export function OperationalBulletinsPage() {
  return <BulletinsWorkspace />;
}
