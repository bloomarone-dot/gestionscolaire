import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLTELayout from './AdminLTELayout';
import SuperAdminNavigation, { SUPERADMIN_PAGE_TITLES } from '../components/SuperAdminNavigation';
import SuperAdminHeader from '../components/SuperAdminHeader';

export default function SuperAdminLayout() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || user.role !== 'superadmin') {
    return <Navigate to="/login" replace />;
  }

  const pageTitle = SUPERADMIN_PAGE_TITLES[location.pathname] || 'Super Admin';

  return (
    <AdminLTELayout
      brandTitle="EduSaaS"
      brandSubtitle="Super Admin"
      brandIcon="fa-graduation-cap"
      sidebar={<SuperAdminNavigation />}
      navbarExtra={<SuperAdminHeader />}
      pageTitle={pageTitle}
      adminlteKey={location.pathname}
    >
      <Outlet />
    </AdminLTELayout>
  );
}
