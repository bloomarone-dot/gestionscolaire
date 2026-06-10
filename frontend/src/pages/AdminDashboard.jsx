import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminNavigation from '../components/AdminNavigation';
import AdminHeader from '../components/AdminHeader';
import DashboardHero from '../components/DashboardHero';
import ProfesseursList from '../components/ProfesseursList';
import ClassesList from '../components/ClassesList';
import MatieresList from '../components/MatieresList';
import ElevesList from '../components/ElevesList';
import AdminStatsCards from '../components/AdminStatsCards';
import AdminNotesPage from './AdminNotesPage';
import AdminPeriodeSaisiePage from './AdminPeriodeSaisiePage';
import AdminBulletinsPage from './AdminBulletinsPage';
import * as api from '../api/api';
import { useSchoolBranding } from '../hooks/useSchoolBranding';
import '../styles/admin-dashboard.css';
import '../styles/dashboard-shared.css';

const ADMIN_QUICK_ACTIONS = [
  { id: 'eleves', icon: '👥', title: 'Élèves', desc: 'Gérer les inscriptions' },
  { id: 'professeurs', icon: '👨‍🏫', title: 'Professeurs', desc: 'Comptes et attributions' },
  { id: 'fenetre-notes', icon: '⏰', title: 'Délais de saisie', desc: 'Fixer les échéances' },
  { id: 'saisie-notes', icon: '📝', title: 'Notes', desc: 'Consulter et modifier' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('accueil');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.fetchAdminStats();
      setStats(data);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      setStats({
        total_professeurs: 0,
        total_classes: 0,
        total_eleves: 0,
        total_matieres: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useSchoolBranding(stats);

  if (!user || user.role !== 'admin') {
    return <div className="unauthorized">Accès non autorisé</div>;
  }

  const schoolName = stats?.school_name || 'Mon établissement';
  const schoolLogo = stats?.logo_url || null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="admin-dashboard">
      <AdminNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        schoolName={schoolName}
        schoolLogo={schoolLogo}
      />

      <div className="admin-content-area">
        <AdminHeader schoolName={schoolName} />

        <div className="admin-content">
          {activeTab === 'accueil' && (
            <div className="dashboard-accueil">
              <DashboardHero
                greeting={greeting}
                title={user.first_name}
                subtitle={`Pilotage de ${schoolName} — élèves, professeurs, notes et délais de saisie.`}
                badge={schoolName}
                stats={stats ? [
                  { value: stats.total_eleves, label: 'Élèves' },
                  { value: stats.total_professeurs, label: 'Professeurs' },
                  { value: stats.total_classes, label: 'Classes' },
                  { value: stats.total_matieres, label: 'Matières' },
                ] : []}
                actions={[
                  { label: 'Définir les délais', icon: '⏰', onClick: () => setActiveTab('fenetre-notes') },
                  { label: 'Gérer les élèves', icon: '👥', variant: 'btn-secondary', onClick: () => setActiveTab('eleves') },
                ]}
              />

              <div className="quick-actions-grid">
                {ADMIN_QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="quick-action-card"
                    onClick={() => setActiveTab(action.id)}
                  >
                    <span className="quick-action-icon">{action.icon}</span>
                    <span className="quick-action-title">{action.title}</span>
                    <span className="quick-action-desc">{action.desc}</span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="page-loader"><div className="spinner" /></div>
              ) : stats ? (
                <AdminStatsCards stats={stats} />
              ) : null}
            </div>
          )}

          {activeTab === 'professeurs' && <ProfesseursList />}
          {activeTab === 'classes' && <ClassesList />}
          {activeTab === 'matieres' && <MatieresList />}
          {activeTab === 'eleves' && <ElevesList />}
          {activeTab === 'saisie-notes' && <AdminNotesPage />}
          {activeTab === 'fenetre-notes' && <AdminPeriodeSaisiePage />}
          {activeTab === 'bulletins' && <AdminBulletinsPage />}
        </div>
      </div>
    </div>
  );
}
