import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as api from '../api/api';
import ProfessorNavigation from '../components/ProfessorNavigation';
import ProfessorHeader from '../components/ProfessorHeader';
import { useSchoolBranding } from '../hooks/useSchoolBranding';
import NotesEntry from '../components/NotesEntry';
import ProfessorMesEleves from '../components/ProfessorMesEleves';
import '../styles/professor-dashboard.css';
import '../styles/professor-workspace.css';

export default function ProfessorDashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('accueil');
  const [enseignements, setEnseignements] = useState([]);
  const [selectedClasse, setSelectedClasse] = useState(null);
  const [selectedMatiere, setSelectedMatiere] = useState(null);
  const [stats, setStats] = useState({
    total_classes: 0,
    total_eleves: 0,
    recent_notes: 0,
    school_name: null,
    logo_url: null,
    primary_color: '#8b5cf6',
    secondary_color: '#a78bfa',
  });

  useSchoolBranding(stats);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'professeur') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'professeur') return;
    api.getProfessorStats().then(setStats).catch(console.error);
    api.getProfessorEnseignements()
      .then((data) => {
        const mats = data.matieres || [];
        setEnseignements(mats);
        if (mats.length > 0 && mats[0].classes?.length > 0) {
          setSelectedMatiere(mats[0]);
          setSelectedClasse(mats[0].classes[0]);
          setActiveSection('notes');
        }
      })
      .catch(console.error);
  }, [isAuthenticated, user]);

  const handleSelectTeaching = (classe, matiere) => {
    setSelectedClasse(classe);
    setSelectedMatiere(matiere);
  };

  if (!isAuthenticated || user?.role !== 'professeur') {
    return <div className="unauthorized">Accès refusé</div>;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const profTitle = user.last_name ? `M. ${user.last_name}` : user.first_name || user.username;

  return (
    <div className="professor-dashboard">
      <ProfessorNavigation
        enseignements={enseignements}
        selectedClasseId={selectedClasse?.id}
        selectedMatiereId={selectedMatiere?.id}
        onSelectTeaching={handleSelectTeaching}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        schoolName={stats.school_name}
        schoolLogo={stats.logo_url}
      />

      <div className="professor-content-area">
        <ProfessorHeader schoolName={stats.school_name} />

        <div className="professor-content">
          {activeSection === 'accueil' && (
            <div className="prof-workspace">
              <div className="prof-workspace-top">
                <div className="prof-greeting-block">
                  <h1>{greeting} {profTitle} 👋</h1>
                  <p>Bienvenue dans votre espace de saisie des notes.</p>
                </div>
              </div>
              <div className="professor-stats-grid">
                <div className="stat-card stat-card-emerald">
                  <div className="stat-icon">📚</div>
                  <div className="stat-content">
                    <div className="stat-number">{stats.total_classes}</div>
                    <div className="stat-label">Classes assignées</div>
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
              <div className="prof-welcome-card">
                <h2>Choisissez une classe dans le menu</h2>
                <p>
                  Dépliez une matière dans « Mes enseignements » à gauche, sélectionnez votre classe,
                  puis saisissez les notes par séquence ou trimestre.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'notes' && (
            <>
              <div className="prof-workspace-top">
                <div className="prof-greeting-block">
                  <h1>{greeting} {profTitle} 👋</h1>
                  <p>Bienvenue dans votre espace de saisie des notes.</p>
                </div>
              </div>
              {selectedClasse && selectedMatiere ? (
                <NotesEntry
                  classe={selectedClasse}
                  variant="professor"
                  fixedMatiereId={selectedMatiere.id}
                  matiereName={selectedMatiere.nom}
                />
              ) : (
                <div className="prof-welcome-card">
                  <h2>Sélectionnez une classe</h2>
                  <p>Choisissez une matière et une classe dans le menu de gauche pour commencer la saisie.</p>
                </div>
              )}
            </>
          )}

          {activeSection === 'bulletins' && (
            <section className="content-section content-section-flat">
              <header className="section-header">
                <h2>Mes élèves</h2>
                <p>Consultez l&apos;effectif de vos classes et les résultats par trimestre (lecture seule)</p>
              </header>
              <ProfessorMesEleves />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
