import { useState } from 'react';
import '../styles/professor-navigation.css';

export default function ProfessorNavigation({
  enseignements = [],
  selectedClasseId,
  selectedMatiereId,
  onSelectTeaching,
  activeSection,
  onSectionChange,
  schoolName,
  schoolLogo,
}) {
  const [expandedMatieres, setExpandedMatieres] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleMatiere = (matiereId) => {
    setExpandedMatieres((prev) => ({ ...prev, [matiereId]: !prev[matiereId] }));
  };

  const handleSelect = (classe, matiere) => {
    onSelectTeaching(classe, matiere);
    onSectionChange('notes');
    setMobileOpen(false);
  };

  return (
    <nav className="professor-navigation">
      <div className="prof-nav-header">
        {schoolLogo ? (
          <img src={schoolLogo} alt="" className="school-logo-thumb" />
        ) : (
          <div className="prof-nav-icon">🎓</div>
        )}
        <div className="prof-nav-brand-text">
          <div className="prof-nav-title">EduSaaS</div>
          <div className="prof-nav-subtitle">{schoolName || 'Espace Enseignant'}</div>
        </div>
        <button type="button" className="nav-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
          ☰
        </button>
      </div>

      <div className={`prof-nav-body ${mobileOpen ? 'open' : ''}`}>
        <div className="prof-nav-section-label">Navigation</div>

        <button
          type="button"
          className={`prof-nav-main-link ${activeSection === 'accueil' ? 'active' : ''}`}
          onClick={() => { onSectionChange('accueil'); setMobileOpen(false); }}
        >
          <span className="nav-icon">🏠</span>
          <span>Tableau de bord</span>
        </button>

        <div className="prof-nav-section-label">Mes enseignements</div>

        {enseignements.length === 0 ? (
          <p className="prof-nav-empty">Aucune attribution</p>
        ) : (
          <ul className="prof-matiere-tree">
            {enseignements.map((matiere) => {
              const isExpanded = expandedMatieres[matiere.id] !== false;
              const hasActiveClass = matiere.classes?.some(
                (c) => c.id === selectedClasseId && matiere.id === selectedMatiereId,
              );
              return (
                <li key={matiere.id} className="prof-matiere-item">
                  <button
                    type="button"
                    className={`prof-matiere-btn ${hasActiveClass ? 'active' : ''}`}
                    onClick={() => toggleMatiere(matiere.id)}
                  >
                    <span className="prof-matiere-chevron">{isExpanded ? '▾' : '▸'}</span>
                    <span className="prof-matiere-name">{matiere.nom}</span>
                  </button>
                  {isExpanded && (
                    <ul className="prof-classe-list">
                      {matiere.classes.map((classe) => (
                        <li key={classe.id}>
                          <button
                            type="button"
                            className={`prof-classe-btn ${
                              selectedClasseId === classe.id && selectedMatiereId === matiere.id ? 'active' : ''
                            }`}
                            onClick={() => handleSelect(classe, matiere)}
                          >
                            <span>{classe.nom}</span>
                            <span className="prof-classe-section-tag">
                              {classe.section === 'anglophone' ? 'EN' : 'FR'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          className={`prof-nav-main-link ${activeSection === 'bulletins' ? 'active' : ''}`}
          onClick={() => { onSectionChange('bulletins'); setMobileOpen(false); }}
        >
          <span className="nav-icon">👥</span>
          <span>Mes élèves</span>
        </button>
      </div>

      <div className="prof-sidebar-footer">
        <div className="prof-help-box">
          <strong>Besoin d&apos;aide ?</strong>
          <p>Consultez le guide rapide ou contactez l&apos;administrateur.</p>
        </div>
      </div>
    </nav>
  );
}
