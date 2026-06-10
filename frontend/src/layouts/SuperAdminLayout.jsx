import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SuperAdminNavigation from '../components/SuperAdminNavigation';
import SuperAdminHeader from '../components/SuperAdminHeader';
import '../styles/superadmin-layout.css';

export default function SuperAdminLayout() {
  const { user } = useAuth();

  if (!user || user.role !== 'superadmin') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="sa-layout">
      <SuperAdminNavigation />
      <div className="sa-content-area">
        <SuperAdminHeader />
        <main className="sa-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
