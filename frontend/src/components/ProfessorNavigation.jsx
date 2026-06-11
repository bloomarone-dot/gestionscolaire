import { useState } from 'react';

export default function ProfessorNavigation({
  enseignements = [],
  selectedClasseId,
  selectedMatiereId,
  onSelectTeaching,
  activeSection,
  onSectionChange,
}) {
  const [expandedMatieres, setExpandedMatieres] = useState({});

  const toggleMatiere = (e, matiereId) => {
    e.preventDefault();
    setExpandedMatieres((prev) => ({ ...prev, [matiereId]: !prev[matiereId] }));
  };

  const handleSelect = (e, classe, matiere) => {
    e.preventDefault();
    onSelectTeaching(classe, matiere);
    onSectionChange('notes');
  };

  return (
    <nav className="sidebar-nav-menu">
      <ul className="nav nav-pills nav-sidebar flex-column" role="menu">
        <li className="nav-header">Navigation</li>
        <li className="nav-item">
          <a
            href="#"
            className={`nav-link ${activeSection === 'accueil' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onSectionChange('accueil'); }}
          >
            <i className="nav-icon fas fa-home" />
            <p>Tableau de bord</p>
          </a>
        </li>

        <li className="nav-header">Mes enseignements</li>

        {enseignements.length === 0 ? (
          <li className="nav-item">
            <span className="nav-link disabled">
              <i className="nav-icon far fa-circle" />
              <p>Aucune attribution</p>
            </span>
          </li>
        ) : (
          enseignements.map((matiere) => {
            const isExpanded = expandedMatieres[matiere.id] !== false;
            const hasActiveClass = matiere.classes?.some(
              (c) => c.id === selectedClasseId && matiere.id === selectedMatiereId,
            );
            return (
              <li key={matiere.id} className={`nav-item has-treeview ${isExpanded ? 'menu-open' : ''}`}>
                <a
                  href="#"
                  className={`nav-link ${hasActiveClass ? 'active' : ''}`}
                  onClick={(e) => toggleMatiere(e, matiere.id)}
                >
                  <i className="nav-icon fas fa-book" />
                  <p>
                    {matiere.nom}
                    <i className="right fas fa-angle-left" />
                  </p>
                </a>
                {isExpanded && (
                  <ul className="nav nav-treeview">
                    {matiere.classes?.map((classe) => (
                      <li key={classe.id} className="nav-item">
                        <a
                          href="#"
                          className={`nav-link ${
                            selectedClasseId === classe.id && selectedMatiereId === matiere.id ? 'active' : ''
                          }`}
                          onClick={(e) => handleSelect(e, classe, matiere)}
                        >
                          <i className="nav-icon far fa-dot-circle" />
                          <p>
                            {classe.nom}
                            <span className="badge badge-light right">{classe.section === 'anglophone' ? 'EN' : 'FR'}</span>
                          </p>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })
        )}

        <li className="nav-item">
          <a
            href="#"
            className={`nav-link ${activeSection === 'bulletins' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onSectionChange('bulletins'); }}
          >
            <i className="nav-icon fas fa-users" />
            <p>Mes élèves</p>
          </a>
        </li>
      </ul>
    </nav>
  );
}

export const PROFESSOR_PAGE_TITLES = {
  accueil: 'Tableau de bord',
  notes: 'Saisie des notes',
  bulletins: 'Mes élèves',
};

export const PROFESSOR_PAGE_SUBTITLES = {
  accueil: 'Bienvenue dans votre espace enseignant',
  notes: 'Enregistrez les notes par séquence ou trimestre',
  bulletins: 'Consultation des effectifs et résultats',
};
