import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboard from './pages/AdminDashboard';
import ProfessorDashboard from './pages/ProfessorDashboard';
import SuperAdminHome from './pages/superadmin/SuperAdminHome';
import SuperAdminSchoolsPage from './pages/superadmin/SuperAdminSchoolsPage';
import SuperAdminSchoolFormPage from './pages/superadmin/SuperAdminSchoolFormPage';
import SuperAdminAdminsPage from './pages/superadmin/SuperAdminAdminsPage';
import SuperAdminLogsPage from './pages/superadmin/SuperAdminLogsPage';
import SuperAdminSettingsPage from './pages/superadmin/SuperAdminSettingsPage';
import ElevesPage from './pages/ElevesPage';
import NotesPage from './pages/NotesPage';
import BulletinPage from './pages/BulletinPage';
import OfflineBanner from './components/OfflineBanner';

function ProtectedLayout({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'professeur') {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  const homeRedirect = isAuthenticated
    ? user?.role === 'superadmin'
      ? <Navigate to="/superadmin/dashboard" replace />
      : user?.role === 'admin'
        ? <Navigate to="/admin/dashboard" replace />
        : user?.role === 'professeur'
          ? <Navigate to="/professor/dashboard" replace />
          : <Navigate to="/dashboard" replace />
    : <HomePage />;

  const loginRedirect = isAuthenticated
    ? user?.role === 'superadmin'
      ? <Navigate to="/superadmin/dashboard" replace />
      : user?.role === 'admin'
        ? <Navigate to="/admin/dashboard" replace />
        : user?.role === 'professeur'
          ? <Navigate to="/professor/dashboard" replace />
          : <Navigate to="/dashboard" replace />
    : <LoginPage />;

  return (
    <Routes>
      <Route path="/" element={homeRedirect} />
      <Route path="/login" element={loginRedirect} />

      {/* Super Admin — layout avec sidebar */}
      <Route path="/superadmin" element={
        <ProtectedLayout><SuperAdminLayout /></ProtectedLayout>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminHome />} />
        <Route path="schools" element={<SuperAdminSchoolsPage />} />
        <Route path="schools/new" element={<SuperAdminSchoolFormPage />} />
        <Route path="schools/:id/edit" element={<SuperAdminSchoolFormPage />} />
        <Route path="admins" element={<SuperAdminAdminsPage />} />
        <Route path="logs" element={<SuperAdminLogsPage />} />
        <Route path="settings" element={<SuperAdminSettingsPage />} />
      </Route>

      <Route path="/admin/dashboard" element={
        <ProtectedLayout><AdminDashboard /></ProtectedLayout>
      } />

      <Route path="/professor/dashboard" element={
        <ProtectedLayout><ProfessorDashboard /></ProtectedLayout>
      } />

      <Route path="/dashboard" element={
        <ProtectedLayout><DashboardPage /></ProtectedLayout>
      } />
      <Route path="/eleves" element={
        <ProtectedLayout><ElevesPage /></ProtectedLayout>
      } />
      <Route path="/notes" element={
        <ProtectedLayout><NotesPage /></ProtectedLayout>
      } />
      <Route path="/bulletin" element={
        <ProtectedLayout><BulletinPage /></ProtectedLayout>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
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
