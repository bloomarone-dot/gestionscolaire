import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as api from '../api/api';
import ProfessorNavigation, {
  PROFESSOR_PAGE_TITLES,
  PROFESSOR_PAGE_SUBTITLES,
} from '../components/ProfessorNavigation';
import AdminLTELayout from '../layouts/AdminLTELayout';
import { useSchoolBranding } from '../hooks/useSchoolBranding';
import NotesEntry from '../components/NotesEntry';
import ProfessorMesEleves from '../components/ProfessorMesEleves';
import { loadProfessorWorkspace, saveProfessorWorkspace } from '../utils/draftStorage';
import '../styles/professor-workspace.css';

export default function ProfessorDashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const savedWorkspace = loadProfessorWorkspace();
  const [activeSection, setActiveSection] = useState(savedWorkspace?.activeSection || 'accueil');
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
        const ws = loadProfessorWorkspace();
        if (ws?.matiereId && ws?.classeId) {
          const mat = mats.find((m) => m.id === ws.matiereId);
          const cls = mat?.classes?.find((c) => c.id === ws.classeId);
          if (mat && cls) {
            setSelectedMatiere(mat);
            setSelectedClasse(cls);
            setActiveSection(ws.activeSection || 'notes');
            return;
          }
        }
        if (mats.length > 0 && mats[0].classes?.length > 0 && !ws) {
          setSelectedMatiere(mats[0]);
          setSelectedClasse(mats[0].classes[0]);
          setActiveSection('notes');
        }
      })
      .catch(console.error);
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'professeur') return;
    saveProfessorWorkspace({
      activeSection,
      matiereId: selectedMatiere?.id || null,
      classeId: selectedClasse?.id || null,
    });
  }, [activeSection, selectedMatiere, selectedClasse, isAuthenticated, user]);

  const handleSelectTeaching = (classe, matiere) => {
    setSelectedClasse(classe);
    setSelectedMatiere(matiere);
  };

  if (!isAuthenticated || user?.role !== 'professeur') {
    return <div className="unauthorized">Accès refusé</div>;
  }

  const pageSubtitle = activeSection === 'notes' && selectedClasse && selectedMatiere
    ? `${selectedMatiere.nom} — ${selectedClasse.nom}`
    : PROFESSOR_PAGE_SUBTITLES[activeSection] || stats.school_name;

  return (
    <AdminLTELayout
      brandTitle="EduSaaS"
      brandSubtitle={stats.school_name || 'Espace Enseignant'}
      brandLogo={stats.logo_url}
      brandIcon="fa-chalkboard-teacher"
      roleLabel="Professeur"
      sidebar={(
        <ProfessorNavigation
          enseignements={enseignements}
          selectedClasseId={selectedClasse?.id}
          selectedMatiereId={selectedMatiere?.id}
          onSelectTeaching={handleSelectTeaching}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      )}
      pageTitle={PROFESSOR_PAGE_TITLES[activeSection] || 'Espace enseignant'}
      pageSubtitle={pageSubtitle}
      adminlteKey={`${activeSection}-${selectedClasse?.id}-${selectedMatiere?.id}`}
    >
          {activeSection === 'accueil' && (
            <div className="dashboard-accueil prof-workspace">
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
    </AdminLTELayout>
  );
}
