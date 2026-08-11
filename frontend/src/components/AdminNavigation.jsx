import { useState } from 'react';
import {
  LayoutDashboard, LayoutGrid, BookOpen, Landmark, Presentation, UserCog, Users, UserPlus,
  TrendingUp, PenSquare, Clock, FileText, Megaphone, Bell, School, Settings, ShieldCheck,
  ChevronDown,
} from 'lucide-react';

// Ordre hiérarchique STRICT du cahier des charges (§8). Les rubriques non encore
// implémentées sont marquées `disabled` (placeholder « Bientôt »).
const NAV_SECTIONS = [
  {
    title: null,
    items: [{ id: 'accueil', icon: LayoutDashboard, label: 'Tableau de bord' }],
  },
  {
    title: 'Structure pédagogique',
    items: [
      { id: 'classes', icon: LayoutGrid, label: 'Classes' },
      { id: 'matieres', icon: BookOpen, label: 'Matières' },
      { id: 'referentiel', icon: Landmark, label: 'Référentiel MINESEC', disabled: true },
    ],
  },
  {
    title: 'Personnel',
    items: [
      { id: 'professeurs', icon: Presentation, label: 'Enseignants' },
      { id: 'direction', icon: UserCog, label: 'Direction / Administration', disabled: true },
    ],
  },
  {
    title: 'Élèves',
    items: [
      { id: 'eleves', icon: Users, label: 'Liste des élèves' },
      { id: 'inscriptions', icon: UserPlus, label: 'Inscriptions', disabled: true },
      { id: 'promotions', icon: TrendingUp, label: 'Promotions / Passages', disabled: true },
    ],
  },
  {
    title: 'Évaluations',
    items: [
      { id: 'saisie-notes', icon: PenSquare, label: 'Saisie des notes' },
      { id: 'fenetre-notes', icon: Clock, label: 'Délais de saisie' },
      { id: 'bulletins', icon: FileText, label: 'Bulletins' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { id: 'annonces', icon: Megaphone, label: 'Annonces', disabled: true },
      { id: 'notifications', icon: Bell, label: 'Notifications', disabled: true },
    ],
  },
  {
    title: 'Paramètres',
    items: [
      { id: 'profil-ecole', icon: School, label: "Profil de l'école", disabled: true },
      { id: 'bulletin-config', icon: Settings, label: 'Config. bulletins' },
      { id: 'utilisateurs', icon: ShieldCheck, label: 'Utilisateurs & Droits', disabled: true },
    ],
  },
];

export default function AdminNavigation({ activeTab, onTabChange }) {
  // Toutes les sections sont ouvertes par défaut ; repliables pour garder le menu lisible.
  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(NAV_SECTIONS.filter((s) => s.title).map((s) => [s.title, true]))
  );

  const toggleSection = (title) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const renderItem = (tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    return (
      <li key={tab.id} role="none">
        <button
          type="button"
          role="menuitem"
          disabled={tab.disabled}
          title={tab.disabled ? 'Fonctionnalité à venir' : undefined}
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
            tab.disabled
              ? 'cursor-not-allowed text-white/25'
              : isActive
                ? 'bg-gradient-to-r from-[#B8863B]/25 to-transparent text-white'
                : 'text-white/65 hover:bg-white/5 hover:text-white'
          }`}
        >
          <span
            className={`absolute left-0 top-1/2 h-4/6 w-[3px] -translate-y-1/2 rounded-full bg-[#e8c579] transition-opacity ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden="true"
          />
          <Icon size={18} className={`shrink-0 ${isActive ? 'text-[#e8c579]' : ''}`} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{tab.label}</span>
          {tab.disabled && (
            <span className="shrink-0 rounded-full border border-[#e8c579]/30 bg-[#e8c579]/10 px-2 py-0.5 text-[10px] font-bold text-[#f3d68a]">
              Bientôt
            </span>
          )}
        </button>
      </li>
    );
  };

  return (
    <nav className="text-[0.87rem]" aria-label="Navigation administration">
      <ul className="flex flex-col gap-1" role="menu">
        {NAV_SECTIONS.map((section, si) => {
          if (!section.title) {
            return section.items.map((tab) => renderItem(tab));
          }

          const isOpen = openSections[section.title];
          const groupId = `nav-group-${si}`;

          return (
            <li key={section.title} role="none" className="pt-3 first:pt-0">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/35 transition hover:text-white/60"
                onClick={() => toggleSection(section.title)}
                aria-expanded={isOpen}
                aria-controls={groupId}
              >
                <span>{section.title}</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              <div
                id={groupId}
                className="grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <ul className="flex min-h-0 flex-col gap-1 overflow-hidden" role="none">
                  {section.items.map((tab) => renderItem(tab))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
