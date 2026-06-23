import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import SaaSLayout from './components/layout/SaaSLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import ProfessorLayout from './components/layout/ProfessorLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/modern/Dashboard';
import SuperAdminConsole from './pages/modern/SuperAdminConsole';
import ReferentielAdminPage, { SubjectCreatePage, EligibilityCreatePage } from './pages/modern/ReferentielAdminPage';
import {
  AttendancePage,
  ParentsPage,
  ReportsPage,
  ExpensesPage,
  UsersPage,
} from './pages/modern/ListPages';
import PaymentsPage from './pages/modern/PaymentsPage';
import SchedulesPage from './pages/modern/SchedulesPage';
import { SettingsPage } from './pages/modern/SchoolSettings';
import PromotionsPage from './pages/modern/PromotionsPage';
import ReferentielPage from './pages/modern/ReferentielPage';
import NotificationsPage from './pages/modern/NotificationsPage';
import AnnouncementsPage from './pages/modern/AnnouncementsPage';
import {
  ClasseCreatePage,
  EleveCreatePage,
  OperationalBulletinsPage,
  OperationalClassesPage,
  OperationalGradesPage,
  OperationalStudentsPage,
  OperationalSubjectsPage,
  OperationalTeachersPage,
  PersonnelCreatePage,
  ProfessorBulletinsPage,
  ProfessorClassesPage,
  ProfessorDashboardPage,
  ProfessorGradesPage,
  ProfessorProfilePage,
  ProfessorStudentsPage,
} from './pages/modern/SchoolOperations';
import SecretaryLayout from './components/layout/SecretaryLayout';
import SecretaryDashboard from './pages/modern/SecretaryDashboard';
import TeamPage from './pages/modern/TeamPage';
import OfflineBanner from './components/OfflineBanner';

function ProtectedSecretary() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'secretaire') return <Navigate to="/app/dashboard" replace />;
  return <SecretaryLayout />;
}

function ProtectedApp() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'superadmin') {
    return <Navigate to="/superadmin/dashboard" replace />;
  }
  if (user?.role === 'secretaire') {
    return <Navigate to="/secretary/dashboard" replace />;
  }
  if (user?.role === 'professeur' || user?.role === 'enseignant') {
    return <Navigate to="/professor/dashboard" replace />;
  }
  return <SaaSLayout />;
}

function ProtectedProfessor() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'professeur' && user?.role !== 'enseignant') return <Navigate to="/app/dashboard" replace />;
  return <ProfessorLayout />;
}

function ProtectedSuperAdmin() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'superadmin') return <Navigate to="/app/dashboard" replace />;
  return <SuperAdminLayout />;
}

function LoginRoute() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <LoginPage />;
  if (user?.role === 'superadmin') return <Navigate to="/superadmin/dashboard" replace />;
  if (user?.role === 'secretaire') return <Navigate to="/secretary/dashboard" replace />;
  if (user?.role === 'professeur' || user?.role === 'enseignant') return <Navigate to="/professor/dashboard" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'superadmin') return <Navigate to="/superadmin/dashboard" replace />;
  if (user?.role === 'secretaire') return <Navigate to="/secretary/dashboard" replace />;
  if (user?.role === 'professeur' || user?.role === 'enseignant') return <Navigate to="/professor/dashboard" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/superadmin" element={<ProtectedSuperAdmin />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminConsole tab="dashboard" />} />
        <Route path="schools" element={<SuperAdminConsole tab="schools" />} />
        <Route path="admins" element={<SuperAdminConsole tab="admins" />} />
        <Route path="referentiel" element={<ReferentielAdminPage />} />
        <Route path="referentiel/matiere/nouveau" element={<SubjectCreatePage />} />
        <Route path="referentiel/eligibilite/nouveau" element={<EligibilityCreatePage />} />
        <Route path="settings" element={<SuperAdminConsole tab="settings" />} />
      </Route>
      <Route path="/professor" element={<ProtectedProfessor />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ProfessorDashboardPage />} />
        <Route path="classes" element={<ProfessorClassesPage />} />
        <Route path="students" element={<ProfessorStudentsPage />} />
        <Route path="grades" element={<ProfessorGradesPage />} />
        <Route path="bulletins" element={<ProfessorBulletinsPage />} />
        <Route path="profile" element={<ProfessorProfilePage />} />
      </Route>
      <Route path="/secretary" element={<ProtectedSecretary />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SecretaryDashboard />} />
        <Route path="students" element={<OperationalStudentsPage />} />
        <Route path="students/nouveau" element={<EleveCreatePage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="schedules" element={<SchedulesPage />} />
      </Route>
      <Route path="/app" element={<ProtectedApp />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="students" element={<OperationalStudentsPage />} />
        <Route path="students/nouveau" element={<EleveCreatePage />} />
        <Route path="parents" element={<ParentsPage />} />
        <Route path="teachers" element={<OperationalTeachersPage />} />
        <Route path="teachers/nouveau" element={<PersonnelCreatePage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="classes" element={<OperationalClassesPage />} />
        <Route path="classes/nouveau" element={<ClasseCreatePage />} />
        <Route path="subjects" element={<OperationalSubjectsPage />} />
        <Route path="referentiel" element={<ReferentielPage />} />
        <Route path="schedules" element={<SchedulesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="grades" element={<OperationalGradesPage />} />
        <Route path="bulletins" element={<OperationalBulletinsPage />} />
        <Route path="promotions" element={<PromotionsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <OfflineBanner />
      </AuthProvider>
    </BrowserRouter>
  );
}
