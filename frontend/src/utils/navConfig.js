import {
  ArrowRightLeft, BarChart3, Bell, BookOpen, CalendarDays, CheckCircle2, ClipboardList,
  GraduationCap, LayoutDashboard, Megaphone, Receipt, School, Settings,
  UserCog, Users, WalletCards, Sparkles,
} from 'lucide-react';
import { isLanguageCenter, isPrimarySchool } from './establishmentKind';

export const NAV_ICONS = {
  LayoutDashboard,
  School,
  BookOpen,
  GraduationCap,
  UserCog,
  Users,
  ClipboardList,
  ArrowRightLeft,
  BarChart3,
  Receipt,
  Megaphone,
  Bell,
  Settings,
  Sparkles,
  CalendarDays,
  WalletCards,
  CheckCircle2,
};

function flat(items) {
  return items.flatMap((entry) => (entry.items ? entry.items : [entry]));
}

/** Menu admin — centre de langues (4 blocs métier). */
function languageCenterAdminNav(ui) {
  return [
    { to: '/app/dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard' },
    {
      group: 'Pilotage pédagogique',
      icon: 'BookOpen',
      items: [
        { to: '/app/classes', label: ui.classes, icon: 'School' },
        { to: '/app/subjects', label: ui.subjects, icon: 'BookOpen' },
        { to: '/app/grades', label: ui.grades, icon: 'BarChart3' },
        { to: '/app/bulletins', label: ui.bulletin, icon: 'Receipt' },
        { to: '/app/promotions', label: ui.promotions, icon: 'ArrowRightLeft' },
        { to: '/app/progression/policies', label: 'Politiques de progression', icon: 'Settings' },
        { to: '/app/progression/proposals', label: 'Validation décisions', icon: 'CheckCircle2' },
      ],
    },
    {
      group: 'Administration',
      icon: 'Users',
      items: [
        { to: '/app/students', label: ui.studentsList, icon: 'Users' },
        { to: '/app/students/nouveau', label: ui.enrollment, icon: 'ClipboardList' },
        { to: '/app/schedules', label: 'Planning', icon: 'CalendarDays' },
      ],
    },
    {
      group: 'Équipe',
      icon: 'UserCog',
      items: [
        { to: '/app/team', label: 'Secrétaires & comptes', icon: 'UserCog' },
        { to: '/app/teachers', label: ui.teachers, icon: 'GraduationCap', match: { fonction: 'enseignant' } },
      ],
    },
    {
      group: 'Trésorerie',
      icon: 'WalletCards',
      items: [
        { to: '/app/payments', label: 'Paiements', icon: 'WalletCards' },
        { to: '/app/expenses', label: 'Dépenses', icon: 'WalletCards' },
      ],
    },
    {
      group: 'Communication',
      icon: 'Bell',
      items: [
        { to: '/app/announcements', label: 'Annonces', icon: 'Megaphone' },
        { to: '/app/notifications', label: 'Notifications', icon: 'Bell' },
      ],
    },
    {
      group: 'Paramètres',
      icon: 'Settings',
      items: [
        { to: '/app/settings', label: ui.schoolProfile, icon: 'School' },
      ],
    },
  ];
}

/** Menu admin — école primaire. */
function primarySchoolAdminNav(ui) {
  return [
    { to: '/app/dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard' },
    {
      group: 'Pédagogie',
      icon: 'School',
      items: [
        { to: '/app/classes', label: ui.classes, icon: 'School' },
        { to: '/app/subjects', label: ui.subjects, icon: 'BookOpen' },
        { to: '/app/grades', label: ui.grades, icon: 'BarChart3' },
        { to: '/app/bulletins', label: ui.bulletin, icon: 'Receipt' },
        { to: '/app/promotions', label: ui.promotions, icon: 'ArrowRightLeft' },
        { to: '/app/progression/policies', label: 'Politiques de progression', icon: 'Settings' },
        { to: '/app/progression/proposals', label: 'Validation décisions', icon: 'CheckCircle2' },
      ],
    },
    {
      group: 'Élèves',
      icon: 'Users',
      items: [
        { to: '/app/students', label: ui.studentsList, icon: 'Users' },
        { to: '/app/students/nouveau', label: ui.enrollment, icon: 'ClipboardList' },
      ],
    },
    {
      group: 'Équipe',
      icon: 'UserCog',
      items: [
        { to: '/app/team', label: 'Équipe & comptes', icon: 'UserCog' },
        { to: '/app/teachers', label: ui.teachers, icon: 'GraduationCap', match: { fonction: 'enseignant' } },
      ],
    },
    {
      group: 'Trésorerie',
      icon: 'WalletCards',
      items: [
        { to: '/app/payments', label: 'Paiements Mobile Money', icon: 'WalletCards' },
        { to: '/app/expenses', label: 'Retraits & dépenses', icon: 'WalletCards' },
      ],
    },
    {
      group: 'Paramètres',
      icon: 'Settings',
      items: [
        { to: '/app/settings', label: ui.schoolProfile, icon: 'School' },
      ],
    },
  ];
}

/** Menu admin — école MINESEC (structure existante enrichie). */
function schoolAdminNav(ui) {
  return [
    { to: '/app/dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard' },
    {
      group: 'Structure pédagogique',
      icon: 'School',
      items: [
        { to: '/app/classes', label: ui.classes, icon: 'School' },
        { to: '/app/subjects', label: ui.subjects, icon: 'BookOpen' },
      ],
    },
    {
      group: 'Personnel',
      icon: 'UserCog',
      items: [
        { to: '/app/team', label: 'Équipe & comptes', icon: 'UserCog' },
        { to: '/app/teachers', label: ui.teachers, icon: 'GraduationCap', match: { fonction: 'enseignant' } },
        { to: '/app/teachers', label: 'Direction / Administration', icon: 'UserCog', match: { fonction: 'direction' } },
      ],
    },
    {
      group: ui.students,
      icon: 'Users',
      items: [
        { to: '/app/students', label: ui.studentsList, icon: 'Users' },
        { to: '/app/students/nouveau', label: ui.enrollment, icon: 'ClipboardList' },
        { to: '/app/promotions', label: ui.promotions, icon: 'ArrowRightLeft' },
        { to: '/app/progression/policies', label: 'Politiques de progression', icon: 'Settings' },
        { to: '/app/progression/proposals', label: 'Validation décisions', icon: 'CheckCircle2' },
      ],
    },
    {
      group: 'Évaluations',
      icon: 'BarChart3',
      items: [
        { to: '/app/grades', label: ui.grades, icon: 'BarChart3' },
        { to: '/app/bulletins', label: ui.bulletin, icon: 'Receipt' },
      ],
    },
    {
      group: 'Communication',
      icon: 'Bell',
      items: [
        { to: '/app/announcements', label: 'Annonces', icon: 'Megaphone' },
        { to: '/app/notifications', label: 'Notifications', icon: 'Bell' },
      ],
    },
    {
      group: 'Paramètres',
      icon: 'Settings',
      items: [
        { to: '/app/settings', label: ui.schoolProfile, icon: 'School' },
      ],
    },
    {
      group: 'Extra',
      icon: 'Sparkles',
      items: [
        { to: '/app/parents', label: 'Parents', icon: 'UserCog' },
        { to: '/app/schedules', label: 'Emplois du temps', icon: 'CalendarDays' },
        { to: '/app/attendance', label: 'Présences', icon: 'ClipboardList' },
        { to: '/app/payments', label: 'Paiements', icon: 'WalletCards' },
        { to: '/app/expenses', label: 'Dépenses', icon: 'WalletCards' },
        { to: '/app/reports', label: 'Rapports', icon: 'BarChart3' },
      ],
    },
  ];
}

export function buildAdminNav(ui, establishmentKind = 'SCHOOL') {
  if (isLanguageCenter(establishmentKind)) return languageCenterAdminNav(ui);
  if (isPrimarySchool(establishmentKind)) return primarySchoolAdminNav(ui);
  return schoolAdminNav(ui);
}

export function buildSecretaryNav(ui) {
  return [
    { to: '/secretary/dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard' },
    { to: '/secretary/students/nouveau', label: ui.enrollment, icon: 'ClipboardList' },
    { to: '/secretary/students', label: ui.studentsList, icon: 'Users' },
    { to: '/secretary/payments', label: 'Paiements & reçus', icon: 'WalletCards' },
    { to: '/secretary/schedules', label: 'Planning', icon: 'CalendarDays' },
  ];
}

export function flattenNav(nav) {
  return flat(nav);
}

export function roleLabel(role) {
  const labels = {
    admin: 'Administrateur',
    secretaire: 'Secrétaire',
    enseignant: 'Formateur / Enseignant',
    direction: 'Direction',
    superadmin: 'Super-admin',
    parent: 'Parent',
  };
  return labels[role] || role;
}
