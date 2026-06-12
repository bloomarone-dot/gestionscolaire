import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminLTELayout from '../layouts/AdminLTELayout';
import AdminNavigation, { ADMIN_PAGE_TITLES, ADMIN_PAGE_SUBTITLES } from '../components/AdminNavigation';
import DashboardHero from '../components/DashboardHero';
import ClassSuccessStats from '../components/ClassSuccessStats';
import ProfesseursList from '../components/ProfesseursList';
import ClassesList from '../components/ClassesList';
import MatieresList from '../components/MatieresList';
import ElevesList from '../components/ElevesList';
import AdminNotesPage from './AdminNotesPage';
import AdminPeriodeSaisiePage from './AdminPeriodeSaisiePage';
import AdminBulletinsPage from './AdminBulletinsPage';
import AdminBulletinSettingsPage from './AdminBulletinSettingsPage';
import * as api from '../api/api';
import { useSchoolBranding } from '../hooks/useSchoolBranding';
import { loadAdminWorkspace, saveAdminWorkspace } from '../utils/draftStorage';
import '../styles/dashboard-shared.css';

const ADMIN_QUICK_ACTIONS = [
  { id: 'bulletin-config', icon: 'fa-cog', color: 'info', title: 'Config. bulletins', desc: 'Logo, en-tête, modèle PDF' },
  { id: 'matieres', icon: 'fa-book-open', color: 'success', title: 'Matières', desc: 'Groupes & coefficients' },
  { id: 'classes', icon: 'fa-book', color: 'primary', title: 'Classes', desc: 'Section FR / EN' },
  { id: 'bulletins', icon: 'fa-file-alt', color: 'warning', title: 'Bulletins', desc: 'PDF officiel Cameroun' },
  { id: 'eleves', icon: 'fa-users', color: 'secondary', title: 'Élèves', desc: 'Gérer les inscriptions' },
  { id: 'professeurs', icon: 'fa-chalkboard-teacher', color: 'danger', title: 'Professeurs', desc: 'Comptes et attributions' },
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
              <DashboardHero
                greeting={greeting}
                title={`${user.first_name || user.username}, bienvenue !`}
                subtitle={`Espace administrateur de ${schoolName} — bulletins, élèves, professeurs et notes.`}
                badge={schoolName}
                stats={stats ? [
                  { value: stats.total_eleves, label: 'Élèves' },
                  { value: stats.total_professeurs, label: 'Professeurs' },
                  { value: stats.total_classes, label: 'Classes' },
                  { value: stats.total_matieres, label: 'Matières' },
                ] : []}
                actions={[
                  { label: 'Définir les délais', icon: <i className="fas fa-clock" />, onClick: () => setActiveTab('fenetre-notes') },
                  { label: 'Gérer les élèves', icon: <i className="fas fa-users" />, variant: 'btn-secondary', onClick: () => setActiveTab('eleves') },
                ]}
              />

              <section className="admin-setup-compact">
                <div className="admin-setup-compact-head">
                  <strong>Configurer les bulletins</strong>
                  <span>{ADMIN_SETUP_STEPS.length} étapes</span>
                </div>
                <div className="admin-setup-chips">
                  {ADMIN_SETUP_STEPS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="admin-setup-chip"
                      title={item.hint}
                      onClick={() => setActiveTab(item.id)}
                    >
                      <span className="admin-setup-chip-num">{item.step}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </section>

              {loading ? (
                <div className="page-loader"><div className="spinner" /></div>
              ) : stats?.class_success ? (
                <ClassSuccessStats
                  classSuccess={stats.class_success}
                  trimestre={stats.class_success[0]?.trimestre || 1}
                />
              ) : null}

              <div className="row">
                {ADMIN_QUICK_ACTIONS.map((action) => (
                  <div key={action.id} className="col-12 col-sm-6 col-xl-4">
                    <button
                      type="button"
                      className={`small-box bg-${action.color} border-0 text-left w-100`}
                      onClick={() => setActiveTab(action.id)}
                    >
                      <div className="inner">
                        <h3 className="h5 mb-1">{action.title}</h3>
                        <p>{action.desc}</p>
                      </div>
                      <div className="icon">
                        <i className={`fas ${action.icon}`} />
                      </div>
                      <span className="small-box-footer">
                        Ouvrir <i className="fas fa-arrow-circle-right ml-1" />
                      </span>
                    </button>
                  </div>
                ))}
              </div>
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
