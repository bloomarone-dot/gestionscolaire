import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLTELayout from './AdminLTELayout';
import SuperAdminNavigation, {
  SUPERADMIN_PAGE_TITLES,
  SUPERADMIN_PAGE_SUBTITLES,
} from '../components/SuperAdminNavigation';
import SuperAdminHeader from '../components/SuperAdminHeader';

export default function SuperAdminLayout() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || user.role !== 'superadmin') {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminLTELayout
      brandTitle="EduSaaS"
      brandSubtitle="Super Admin"
      brandIcon="fa-graduation-cap"
      roleLabel="Super Administrateur"
      sidebar={<SuperAdminNavigation />}
      navbarExtra={<SuperAdminHeader />}
      pageTitle={SUPERADMIN_PAGE_TITLES[location.pathname] || 'Super Admin'}
      pageSubtitle={SUPERADMIN_PAGE_SUBTITLES[location.pathname] || ''}
      adminlteKey={location.pathname}
    >
      <Outlet />
    </AdminLTELayout>
  );
}
