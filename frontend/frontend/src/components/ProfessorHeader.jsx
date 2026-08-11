import DashboardUserBar from './DashboardUserBar';

export default function ProfessorHeader({ schoolName }) {
  const contextLabel = schoolName ? (
    <>Établissement : <strong>{schoolName}</strong></>
  ) : null;

  return (
    <DashboardUserBar
      contextLabel={contextLabel}
      roleLabel="Professeur"
    />
  );
}
