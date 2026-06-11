import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminLTELayout from '../layouts/AdminLTELayout';
import AdminNavigation, { ADMIN_PAGE_TITLES, ADMIN_PAGE_SUBTITLES } from '../components/AdminNavigation';
import DashboardHero from '../components/DashboardHero';
import ProfesseursList from '../components/ProfesseursList';
import ClassesList from '../components/ClassesList';
import MatieresList from '../components/MatieresList';
import ElevesList from '../components/ElevesList';
import AdminStatsCards from '../components/AdminStatsCards';
import AdminNotesPage from './AdminNotesPage';
import AdminPeriodeSaisiePage from './AdminPeriodeSaisiePage';
import AdminBulletinsPage from './AdminBulletinsPage';
import AdminBulletinSettingsPage from './AdminBulletinSettingsPage';
import * as api from '../api/api';
import { useSchoolBranding } from '../hooks/useSchoolBranding';
import { loadAdminWorkspace, saveAdminWorkspace } from '../utils/draftStorage';
import '../styles/dashboard-shared.css';

const ADMIN_QUICK_ACTIONS = [
  { id: 'bulletin-config', icon: '⚙️', title: 'Config. bulletins', desc: 'Logo, en-tête, modèle PDF' },
  { id: 'matieres', icon: '📖', title: 'Matières', desc: 'Groupes & coefficients' },
  { id: 'classes', icon: '📚', title: 'Classes', desc: 'Section FR / EN' },
  { id: 'bulletins', icon: '📄', title: 'Bulletins', desc: 'PDF officiel Cameroun' },
  { id: 'eleves', icon: '👥', title: 'Élèves', desc: 'Gérer les inscriptions' },
  { id: 'professeurs', icon: '👨‍🏫', title: 'Professeurs', desc: 'Comptes et attributions' },
];

const ADMIN_SETUP_STEPS = [
  { id: 'bulletin-config', step: 1, label: 'Config. bulletins', hint: 'Logo, en-têtes, modèle Cameroun auto' },
  { id: 'matieres', step: 2, label: 'Matières', hint: 'Créer avec groupe (1–3) & coefficient' },
  { id: 'classes', step: 3, label: 'Classes', hint: 'Une section FR ou EN par classe' },
  { id: 'eleves', step: 4, label: 'Élèves', hint: 'Inscription avec choix de section' },
  { id: 'professeurs', step: 5, label: 'Professeurs', hint: 'Section + classes compatibles' },
  { id: 'bulletins', step: 6, label: 'Bulletins', hint: 'PDF selon section de la classe' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(() => loadAdminWorkspace()?.activeTab || 'accueil');
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

  useEffect(() => {
    saveAdminWorkspace(activeTab);
  }, [activeTab]);

  useSchoolBranding(stats);

  if (!user || user.role !== 'admin') {
    return <div className="unauthorized">Accès non autorisé</div>;
  }

  const schoolName = stats?.school_name || 'Mon établissement';
  const schoolLogo = stats?.logo_url || null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <AdminLTELayout
      brandTitle="Admin Panel"
      brandSubtitle={schoolName}
      brandLogo={schoolLogo}
      brandIcon="fa-school"
      roleLabel="Administrateur"
      sidebar={(
        <AdminNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}
      pageTitle={ADMIN_PAGE_TITLES[activeTab] || 'Administration'}
      pageSubtitle={activeTab === 'accueil' ? schoolName : ADMIN_PAGE_SUBTITLES[activeTab]}
      adminlteKey={activeTab}
    >
          {activeTab === 'accueil' && (
            <div className="dashboard-accueil">
              <section className="admin-setup-guide">
                <h3>Configuration bulletin officiel</h3>
                <p>Suivez ces étapes pour Royal Priesthood et les bulletins Cameroun :</p>
                <ol className="admin-setup-steps">
                  {ADMIN_SETUP_STEPS.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="admin-setup-step-btn"
                        onClick={() => setActiveTab(item.id)}
                      >
                        <span className="admin-setup-step-num">{item.step}</span>
                        <span>
                          <strong>{item.label}</strong>
                          <small>{item.hint}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>

              <DashboardHero
                greeting={greeting}
                title={user.first_name}
                subtitle={`Pilotage de ${schoolName} — bulletins officiels, élèves, professeurs et notes.`}
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
          {activeTab === 'bulletin-config' && <AdminBulletinSettingsPage />}
    </AdminLTELayout>
  );
}
