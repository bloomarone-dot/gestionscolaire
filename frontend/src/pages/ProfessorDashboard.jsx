import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as api from '../api/api';
import ProfessorNavigation from '../components/ProfessorNavigation';
import DashboardHero from '../components/DashboardHero';
import ClassesGrid from '../components/ClassesGrid';
import NotesEntry from '../components/NotesEntry';
import ProfessorBulletins from '../components/ProfessorBulletins';
import '../styles/professor-dashboard.css';
import '../styles/dashboard-shared.css';

const QUICK_ACTIONS = [
  { id: 'mes-classes', icon: '📚', title: 'Mes classes', desc: 'Voir vos classes assignées' },
  { id: 'notes', icon: '📝', title: 'Saisir notes', desc: 'Enregistrer les évaluations' },
  { id: 'bulletins', icon: '📄', title: 'Bulletins', desc: 'Consulter les résultats' },
];

export default function ProfessorDashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('accueil');
  const [selectedClasse, setSelectedClasse] = useState(null);
  const [stats, setStats] = useState({
    total_classes: 0,
    total_eleves: 0,
    recent_notes: 0,
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'professeur') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'professeur') return;
    api.getProfessorStats().then(setStats).catch(console.error);
  }, [isAuthenticated, user]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== 'notes') setSelectedClasse(null);
  };

  const handleClasseSelect = (classe) => {
    setSelectedClasse(classe);
    setActiveTab('notes');
  };

  if (!isAuthenticated || user?.role !== 'professeur') {
    return <div className="unauthorized">Accès refusé</div>;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="professor-dashboard">
      <ProfessorNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="professor-content">
        {activeTab === 'accueil' && (
          <div className="dashboard-accueil">
            <DashboardHero
              greeting={greeting}
              title={`${user.first_name} ${user.last_name}`}
              subtitle="Tableau de bord professeur — suivez vos classes, saisissez les notes et consultez les bulletins."
              badge="Espace enseignant"
              stats={[
                { value: stats.total_classes, label: 'Classes' },
                { value: stats.total_eleves, label: 'Élèves' },
                { value: stats.recent_notes, label: 'Notes saisies' },
              ]}
              actions={[
                { label: 'Saisir des notes', icon: '📝', onClick: () => handleTabChange('mes-classes') },
                { label: 'Voir bulletins', icon: '📄', variant: 'btn-secondary', onClick: () => handleTabChange('bulletins') },
              ]}
            />

            <div className="quick-actions-grid">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="quick-action-card"
                  onClick={() => handleTabChange(action.id)}
                >
                  <span className="quick-action-icon">{action.icon}</span>
                  <span className="quick-action-title">{action.title}</span>
                  <span className="quick-action-desc">{action.desc}</span>
                </button>
              ))}
            </div>

            <div className="professor-stats-grid">
              <div className="stat-card stat-card-emerald">
                <div className="stat-icon">📚</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.total_classes}</div>
                  <div className="stat-label">Mes classes</div>
                </div>
              </div>
              <div className="stat-card stat-card-amber">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.total_eleves}</div>
                  <div className="stat-label">Élèves suivis</div>
                </div>
              </div>
              <div className="stat-card stat-card-emerald">
                <div className="stat-icon">📝</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.recent_notes}</div>
                  <div className="stat-label">Notes enregistrées</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mes-classes' && (
          <section className="content-section content-section-flat">
            <header className="section-header">
              <h2>Mes classes</h2>
              <p>Sélectionnez une classe pour accéder à la saisie des notes</p>
            </header>
            <ClassesGrid onClasseSelect={handleClasseSelect} />
          </section>
        )}

        {activeTab === 'notes' && (
          <section className="content-section content-section-flat">
            {selectedClasse ? (
              <NotesEntry classe={selectedClasse} />
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p className="empty-state-title">Aucune classe sélectionnée</p>
                <p className="empty-state-text">Allez dans « Mes classes » et choisissez une classe pour saisir les notes.</p>
                <button type="button" className="btn btn-primary mt-16" onClick={() => handleTabChange('mes-classes')}>
                  Choisir une classe
                </button>
              </div>
            )}
          </section>
        )}

        {activeTab === 'bulletins' && (
          <section className="content-section content-section-flat">
            <header className="section-header">
              <h2>Bulletins des élèves</h2>
              <p>Consultez les moyennes et détails par matière</p>
            </header>
            <ProfessorBulletins />
          </section>
        )}

        {activeTab === 'parametres' && (
          <section className="content-section">
            <header className="section-header">
              <h2>Paramètres</h2>
              <p>Profil et préférences — bientôt disponible</p>
            </header>
          </section>
        )}
      </div>
    </div>
  );
}
