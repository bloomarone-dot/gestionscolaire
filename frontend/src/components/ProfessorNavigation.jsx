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

  const toggleMatiere = (matiereId) => {
    setExpandedMatieres((prev) => ({ ...prev, [matiereId]: !prev[matiereId] }));
  };

  const handleSelect = (classe, matiere) => {
    onSelectTeaching(classe, matiere);
    onSectionChange('notes');
  };

  return (
    <nav className="mt-2">
      <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
        <li className="nav-header">Navigation</li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link text-left w-100 border-0 bg-transparent ${activeSection === 'accueil' ? 'active' : ''}`}
            onClick={() => onSectionChange('accueil')}
          >
            <i className="nav-icon fas fa-home" />
            <p>Tableau de bord</p>
          </button>
        </li>

        <li className="nav-header">Mes enseignements</li>

        {enseignements.length === 0 ? (
          <li className="nav-item">
            <span className="nav-link text-muted">
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
                <button
                  type="button"
                  className={`nav-link text-left w-100 border-0 bg-transparent ${hasActiveClass ? 'active' : ''}`}
                  onClick={() => toggleMatiere(matiere.id)}
                >
                  <i className="nav-icon fas fa-book" />
                  <p>
                    {matiere.nom}
                    <i className="right fas fa-angle-left" />
                  </p>
                </button>
                {isExpanded && (
                  <ul className="nav nav-treeview">
                    {matiere.classes?.map((classe) => (
                      <li key={classe.id} className="nav-item">
                        <button
                          type="button"
                          className={`nav-link text-left w-100 border-0 bg-transparent ${
                            selectedClasseId === classe.id && selectedMatiereId === matiere.id ? 'active' : ''
                          }`}
                          onClick={() => handleSelect(classe, matiere)}
                        >
                          <i className="nav-icon far fa-circle" />
                          <p>
                            {classe.nom}
                            <span className="badge badge-light right">
                              {classe.section === 'anglophone' ? 'EN' : 'FR'}
                            </span>
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })
        )}

        <li className="nav-item">
          <button
            type="button"
            className={`nav-link text-left w-100 border-0 bg-transparent ${activeSection === 'bulletins' ? 'active' : ''}`}
            onClick={() => onSectionChange('bulletins')}
          >
            <i className="nav-icon fas fa-users" />
            <p>Mes élèves</p>
          </button>
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
