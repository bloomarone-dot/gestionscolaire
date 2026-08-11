import { useState } from 'react';
import { Home, BookOpen, ChevronRight, Circle, Users } from 'lucide-react';

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
    <nav aria-label="Navigation professeur">
      <ul className="flex flex-col gap-1" role="menu">
        <li role="none">
          <button
            type="button"
            role="menuitem"
            onClick={() => onSectionChange('accueil')}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
              activeSection === 'accueil'
                ? 'bg-gradient-to-r from-[#B8863B]/25 to-transparent text-white'
                : 'text-white/65 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Home size={18} className={activeSection === 'accueil' ? 'text-[#e8c579]' : ''} />
            Tableau de bord
          </button>
        </li>

        <li role="none" className="pt-3">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-white/35">Mes enseignements</p>
        </li>

        {enseignements.length === 0 ? (
          <li role="none">
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/30">
              <Circle size={13} />
              Aucune attribution
            </span>
          </li>
        ) : (
          enseignements.map((matiere) => {
            const isExpanded = expandedMatieres[matiere.id] !== false;
            const hasActiveClass = matiere.classes?.some(
              (c) => c.id === selectedClasseId && matiere.id === selectedMatiereId,
            );
            return (
              <li key={matiere.id} role="none">
                <button
                  type="button"
                  onClick={(e) => toggleMatiere(e, matiere.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    hasActiveClass ? 'text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <BookOpen size={18} className={hasActiveClass ? 'text-[#e8c579]' : ''} />
                  <span className="min-w-0 flex-1 truncate">{matiere.nom}</span>
                  <ChevronRight size={14} className={`shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
                {isExpanded && (
                  <ul className="ml-4 mt-1 flex flex-col gap-1 border-l border-white/10 pl-3" role="none">
                    {matiere.classes?.map((classe) => {
                      const active = selectedClasseId === classe.id && selectedMatiereId === matiere.id;
                      return (
                        <li key={classe.id} role="none">
                          <button
                            type="button"
                            onClick={(e) => handleSelect(e, classe, matiere)}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                              active ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <Circle
                              size={7}
                              className={active ? 'shrink-0 fill-[#e8c579] text-[#e8c579]' : 'shrink-0 fill-white/30 text-white/30'}
                            />
                            <span className="min-w-0 flex-1 truncate">{classe.nom}</span>
                            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/60">
                              {classe.section === 'anglophone' ? 'EN' : 'FR'}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })
        )}

        <li role="none" className="pt-2">
          <button
            type="button"
            role="menuitem"
            onClick={() => onSectionChange('bulletins')}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
              activeSection === 'bulletins'
                ? 'bg-gradient-to-r from-[#B8863B]/25 to-transparent text-white'
                : 'text-white/65 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Users size={18} className={activeSection === 'bulletins' ? 'text-[#e8c579]' : ''} />
            Mes élèves
          </button>
        </li>
      </ul>
    </nav>
  );
}
