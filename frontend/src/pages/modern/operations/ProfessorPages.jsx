import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, GraduationCap, School } from "lucide-react";
import * as api from "../../../api/api";
import {
  Button,
  Card,
  DataTable,
  Input,
  PageHeader,
  Select,
  StatCard,
} from "../../../components/ui";
import { classNameById, classRow, Notice, studentRow, useLoad } from "./shared";
import { GradesWorkspace } from "./GradesPages";
import { BulletinsWorkspace } from "./BulletinsPages";

export function ProfessorDashboardPage() {
  const stats = [
    {
      label: "Mes classes",
      value: "4",
      trend: "Cette annee",
      icon: School,
      tone: "blue",
    },
    {
      label: "Eleves suivis",
      value: "186",
      trend: "Toutes classes",
      icon: GraduationCap,
      tone: "emerald",
    },
    {
      label: "Notes saisies",
      value: "72",
      trend: "Ce trimestre",
      icon: CheckCircle2,
      tone: "amber",
    },
  ];
  return (
    <>
      <PageHeader
        title="Espace professeur"
        description="Vue de travail pour classes, eleves, notes et bulletins."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>
    </>
  );
}

export function ProfessorClassesPage() {
  const loadClasses = useCallback(
    async () => (await api.getProfessorClasses()).map(classRow),
    [],
  );
  const { rows, loading, error } = useLoad(loadClasses, []);
  return (
    <>
      <PageHeader title="Mes classes" />
      <Notice
        message={loading ? "Chargement des classes..." : error}
        tone={error ? "amber" : "blue"}
      />
      <DataTable
        title="Classes affectees"
        columns={[
          { key: "name", label: "Classe" },
          { key: "level", label: "Niveau" },
          { key: "students", label: "Effectif" },
          { key: "capacity", label: "Capacite" },
        ]}
        rows={rows}
      />
    </>
  );
}

export function ProfessorStudentsPage() {
  const loadClasses = useCallback(
    async () => (await api.getProfessorClasses()).map(classRow),
    [],
  );
  const { rows: classRows } = useLoad(loadClasses, []);
  const [selectedClass, setSelectedClass] = useState("");
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!selectedClass) return;
    api
      .getClassEleves(selectedClass)
      .then((data) => {
        setRows(
          data.map((eleve) =>
            studentRow(eleve, {
              [String(selectedClass)]: classNameById(classRows, selectedClass),
            }),
          ),
        );
        setNotice("");
      })
      .catch((err) => {
        setRows([]);
        setNotice(err.message || "Backend indisponible.");
      });
  }, [selectedClass, classRows]);

  return (
    <>
      <PageHeader title="Mes eleves" />
      <Notice message={notice} tone="amber" />
      <Card className="mb-6 p-5">
        <Select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="">Selectionner une classe</option>
          {classRows.map((classe) => (
            <option key={classe.id} value={classe.id}>
              {classe.name}
            </option>
          ))}
        </Select>
      </Card>
      <DataTable
        title="Eleves suivis"
        columns={[
          { key: "matricule", label: "Matricule" },
          { key: "name", label: "Nom" },
          { key: "className", label: "Classe" },
          { key: "parent", label: "Contact parent" },
        ]}
        rows={rows}
      />
    </>
  );
}

export function ProfessorGradesPage() {
  return <GradesWorkspace professor />;
}

export function ProfessorBulletinsPage() {
  return <BulletinsWorkspace professor />;
}

export function ProfessorProfilePage() {
  return (
    <>
      <PageHeader title="Mon profil" />
      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Nom" />
          <Input placeholder="Telephone" />
          <Input placeholder="Email" />
          <Input placeholder="Specialite" />
        </div>
        <Button className="mt-5">Enregistrer</Button>
      </Card>
    </>
  );
}
