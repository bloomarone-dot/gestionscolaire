import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import Dashboard from './Dashboard';
import PrimarySchoolDashboard from './PrimarySchoolDashboard';

export default function AdminDashboard() {
  const { isPrimarySchool, loading } = useEstablishmentProfile();

  if (loading) {
    return (
      <div className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">
        Chargement du tableau de bord…
      </div>
    );
  }

  if (isPrimarySchool) {
    return <PrimarySchoolDashboard />;
  }

  return <Dashboard />;
}
