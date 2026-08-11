import DashboardUserBar from './DashboardUserBar';

export default function AdminHeader({ schoolName }) {
  const contextLabel = schoolName ? (
    <>Établissement : <strong>{schoolName}</strong></>
  ) : null;

  return (
    <DashboardUserBar
      contextLabel={contextLabel}
      roleLabel="Administrateur"
    />
  );
}
