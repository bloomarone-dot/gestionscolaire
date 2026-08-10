/**
 * Miroir frontend du registry / variables bulletins V2.
 * Source de vérité = backend (GET /bulletins/v2/catalog + validation CRUD).
 * Ce fichier sert de fallback UX et de defaults d'ajout de composants.
 */

export const A4_MM = {
  portrait: { width_mm: 210, height_mm: 297 },
  landscape: { width_mm: 297, height_mm: 210 },
};

export const CATEGORY_LABELS = {
  structure: 'Structure',
  content: 'Contenu',
  layout: 'Mise en page',
  design: 'Design',
  school: 'Établissement',
  student: 'Élève',
  academic: 'Scolaire',
  summary: 'Résumé',
  signature: 'Signatures',
  other: 'Autres',
};

/** Ordre d'affichage palette (groupes produit). */
export const PALETTE_CATEGORY_ORDER = ['structure', 'content', 'layout'];

export const COMPONENT_META = [
  { type: 'institution_header', category: 'structure', label: 'En-tête établissement', description: 'En-tête officiel' },
  { type: 'student_block', category: 'structure', label: 'Informations élève', description: 'Bloc identité' },
  { type: 'grades_table', category: 'structure', label: 'Tableau des notes', description: 'Notes configurables' },
  { type: 'summary_block', category: 'structure', label: 'Résumé', description: 'Moyenne / rang / décision' },
  { type: 'attendance_block', category: 'structure', label: 'Absences', description: 'Assiduité' },
  { type: 'signatures_row', category: 'structure', label: 'Signatures', description: 'Ligne de signatures' },
  { type: 'school_logo', category: 'structure', label: 'Logo', description: "Logo de l'établissement" },
  { type: 'student_photo', category: 'structure', label: 'Photo élève', description: 'Photo' },
  { type: 'text', category: 'content', label: 'Texte', description: 'Texte libre avec variables' },
  { type: 'image', category: 'content', label: 'Image', description: 'Image / logo / photo' },
  { type: 'qr_code', category: 'content', label: 'QR Code', description: 'QR matricule' },
  { type: 'shape', category: 'layout', label: 'Forme', description: 'Ligne ou rectangle' },
  { type: 'spacer', category: 'layout', label: 'Espacement', description: 'Espace réservé' },
  { type: 'page_number', category: 'layout', label: 'Numéro de page', description: 'Pagination' },
];

export const VARIABLE_CATALOG = [
  { path: 'student.full_name', label: 'Nom complet élève' },
  { path: 'student.first_name', label: 'Prénom' },
  { path: 'student.last_name', label: 'Nom' },
  { path: 'student.matricule', label: 'Matricule' },
  { path: 'student.gender', label: 'Sexe' },
  { path: 'student.age', label: 'Âge' },
  { path: 'student.date_of_birth', label: 'Date de naissance' },
  { path: 'student.repeat_status', label: 'Redoublement' },
  { path: 'class.name', label: 'Classe' },
  { path: 'class.size', label: 'Effectif' },
  { path: 'class.level_code', label: 'Niveau' },
  { path: 'class.cycle_code', label: 'Cycle' },
  { path: 'academic_year.name', label: 'Année scolaire' },
  { path: 'term.name', label: 'Trimestre' },
  { path: 'term.number', label: 'N° trimestre' },
  { path: 'period.label', label: 'Période' },
  { path: 'school.name', label: 'Établissement' },
  { path: 'school.city', label: 'Ville' },
  { path: 'school.motto', label: 'Devise' },
  { path: 'summary.general_average', label: 'Moyenne générale' },
  { path: 'summary.class_average', label: 'Moyenne classe' },
  { path: 'summary.rank', label: 'Rang' },
  { path: 'summary.class_size', label: 'Effectif (résumé)' },
  { path: 'summary.decision', label: 'Décision' },
  { path: 'summary.observation', label: 'Observation' },
  { path: 'attendance.absences', label: 'Absences' },
  { path: 'attendance.sanctions', label: 'Sanctions' },
];

export const GRADES_BIND_OPTIONS = [
  { bind: 'subject.name', label: 'Matière' },
  { bind: 'grades.sequence_5', label: 'Séquence 1 (seq 5)' },
  { bind: 'grades.sequence_6', label: 'Séquence 2 (seq 6)' },
  { bind: 'subject.average', label: 'Moyenne' },
  { bind: 'subject.coefficient', label: 'Coefficient' },
  { bind: 'subject.points', label: 'Notes (points)' },
  { bind: 'subject.rank', label: 'Rang matière' },
  { bind: 'subject.appreciation', label: 'Appréciation' },
  { bind: 'subject.teacher', label: 'Professeur' },
];

const DEFAULT_FRAMES = {
  text: { x_mm: 10, y_mm: 10, width_mm: 80, height_mm: 10 },
  image: { x_mm: 10, y_mm: 10, width_mm: 30, height_mm: 30 },
  shape: { x_mm: 10, y_mm: 10, width_mm: 80, height_mm: 2 },
  spacer: { x_mm: 10, y_mm: 10, width_mm: 190, height_mm: 8 },
  institution_header: { x_mm: 0, y_mm: 0, width_mm: 190, height_mm: 32 },
  school_logo: { x_mm: 0, y_mm: 0, width_mm: 28, height_mm: 28 },
  student_block: { x_mm: 0, y_mm: 34, width_mm: 190, height_mm: 22 },
  student_photo: { x_mm: 160, y_mm: 34, width_mm: 30, height_mm: 35 },
  grades_table: { x_mm: 0, y_mm: 58, width_mm: 190, height_mm: 120 },
  summary_block: { x_mm: 0, y_mm: 185, width_mm: 190, height_mm: 28 },
  attendance_block: { x_mm: 0, y_mm: 216, width_mm: 190, height_mm: 14 },
  signatures_row: { x_mm: 0, y_mm: 235, width_mm: 190, height_mm: 28 },
  qr_code: { x_mm: 170, y_mm: 250, width_mm: 20, height_mm: 20 },
  page_number: { x_mm: 70, y_mm: 270, width_mm: 50, height_mm: 8 },
};

export function defaultGradesColumns() {
  return [
    { id: 'matiere', label: 'Matière', bind: 'subject.name', width: 0.22, align: 'left', visible: true },
    { id: 'seq5', label: 'Séq. 1', bind: 'grades.sequence_5', width: 0.09, align: 'center', visible: true, numeric_format: '0.00' },
    { id: 'seq6', label: 'Séq. 2', bind: 'grades.sequence_6', width: 0.09, align: 'center', visible: true, numeric_format: '0.00' },
    { id: 'moy', label: 'Moyenne', bind: 'subject.average', width: 0.1, align: 'center', visible: true, numeric_format: '0.00' },
    { id: 'coef', label: 'Coef.', bind: 'subject.coefficient', width: 0.08, align: 'center', visible: true },
    { id: 'rang', label: 'Rang', bind: 'subject.rank', width: 0.08, align: 'center', visible: true },
    { id: 'appr', label: 'Appréciation', bind: 'subject.appreciation', width: 0.18, align: 'left', visible: true },
    { id: 'prof', label: 'Professeur', bind: 'subject.teacher', width: 0.16, align: 'left', visible: true },
  ];
}

export function defaultPropsForType(type, catalogDefaults) {
  if (catalogDefaults && typeof catalogDefaults === 'object' && Object.keys(catalogDefaults).length) {
    if (type === 'grades_table' && (!catalogDefaults.columns || !catalogDefaults.columns.length)) {
      return { ...catalogDefaults, columns: defaultGradesColumns() };
    }
    if (type === 'text' && (catalogDefaults.content === undefined || catalogDefaults.content === null)) {
      return { ...catalogDefaults, content: 'Texte' };
    }
    return structuredClone(catalogDefaults);
  }
  switch (type) {
    case 'text':
      return { content: 'Texte', style: { font_family: 'Helvetica', font_size_pt: 10, bold: false, italic: false, color: '#000000', align: 'left' } };
    case 'image':
      return { source: 'school.logo', url: null, fit: 'contain' };
    case 'shape':
      return { shape: 'rectangle', stroke_color: '#000000', stroke_width_pt: 0.5, fill_color: null };
    case 'spacer':
      return { note: '' };
    case 'institution_header':
      return { show_ministry: true, show_logo: true, show_motto: true, show_delegations: true, title: '{{school.name}}', subtitle: '' };
    case 'school_logo':
      return { fit: 'contain' };
    case 'student_block':
      return { fields: ['full_name', 'matricule', 'class', 'gender'], show_labels: true, columns: 2 };
    case 'student_photo':
      return { fit: 'contain', placeholder: true };
    case 'grades_table':
      return {
        columns: defaultGradesColumns(),
        show_group_headers: true,
        show_group_subtotals: true,
        show_header: true,
        repeat_header_on_page_break: true,
        border_color: '#000000',
        header_background: '#EEEEEE',
        font_size_pt: 8,
        row_height_mm: 6,
      };
    case 'summary_block':
      return { fields: ['general_average', 'class_average', 'rank', 'class_size'], show_labels: true };
    case 'attendance_block':
      return { show_absences: true, show_sanctions: true, stub_label_absences: '—', stub_label_sanctions: '—', note: "Données d'assiduité non branchées (stub)." };
    case 'signatures_row':
      return {
        slots: [
          { slot: 'parent', label: 'Parent / Tuteur' },
          { slot: 'teacher', label: 'Professeur principal' },
          { slot: 'principal', label: "Le Chef d'établissement" },
        ],
      };
    case 'qr_code':
      return { content: '{{student.matricule}}' };
    case 'page_number':
      return { format: 'Page {{page}} / {{pages}}' };
    default:
      return {};
  }
}

export function emptyTemplateV1(name = 'Nouveau modèle') {
  return {
    schema_version: 1,
    name,
    page: {
      size: 'A4',
      orientation: 'portrait',
      margins: { top: 10, right: 10, bottom: 12, left: 10 },
    },
    data_binding: {
      period_mode: 'trimestre',
      sequence_columns: [
        { key: 'sequence_5', label: 'Séquence 5', source_type_evaluation: 'sequence_5' },
        { key: 'sequence_6', label: 'Séquence 6', source_type_evaluation: 'sequence_6' },
      ],
      groups_mode: 'from_classe_matiere',
      groups: [
        { id: 'g1', label: 'Premier groupe', order: 1, groupe_numbers: [1], subject_ids: [], subject_name_contains: [], show_subtotal: true },
        { id: 'g2', label: 'Deuxième groupe', order: 2, groupe_numbers: [2], subject_ids: [], subject_name_contains: [], show_subtotal: true },
        { id: 'g3', label: 'Troisième groupe', order: 3, groupe_numbers: [3], subject_ids: [], subject_name_contains: [], show_subtotal: true },
      ],
      include_ungrouped: true,
      complementary_section: true,
    },
    components: [],
    meta: {},
  };
}

let _idSeq = 0;
export function newComponentId(type) {
  _idSeq += 1;
  return `${type}_${Date.now().toString(36)}_${_idSeq}`;
}

export function createComponent(type, catalogDefaults, overrides = {}) {
  const frame = { ...(DEFAULT_FRAMES[type] || DEFAULT_FRAMES.text), ...(overrides.frame || {}) };
  return {
    id: overrides.id || newComponentId(type),
    type,
    frame,
    z_index: overrides.z_index ?? 0,
    visible: true,
    props: defaultPropsForType(type, catalogDefaults),
  };
}

export function pageSizeMm(definition) {
  const orientation = definition?.page?.orientation === 'landscape' ? 'landscape' : 'portrait';
  return A4_MM[orientation];
}

function clampNumber(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/** Zone imprimable (page − marges), en mm — origine des frames template. */
export function usablePageMm(definition) {
  const page = pageSizeMm(definition);
  const margins = definition?.page?.margins || {};
  const left = Number(margins.left) || 0;
  const right = Number(margins.right) || 0;
  const top = Number(margins.top) || 0;
  const bottom = Number(margins.bottom) || 0;
  return {
    width_mm: Math.max(1, page.width_mm - left - right),
    height_mm: Math.max(1, page.height_mm - top - bottom),
  };
}

/**
 * Contraint un frame dans la zone imprimable.
 * Le schéma backend autorise x/y >= -5 ; l'éditeur force >= 0 pour rester imprimable.
 */
export function clampFrameToPage(frame, definition) {
  const usable = usablePageMm(definition);
  const minW = 5;
  const minH = 3;
  let width_mm = clampNumber(Number(frame?.width_mm) || minW, minW, usable.width_mm);
  let height_mm = clampNumber(Number(frame?.height_mm) || minH, minH, usable.height_mm);
  let x_mm = Number(frame?.x_mm);
  let y_mm = Number(frame?.y_mm);
  if (!Number.isFinite(x_mm)) x_mm = 0;
  if (!Number.isFinite(y_mm)) y_mm = 0;
  x_mm = clampNumber(x_mm, 0, Math.max(0, usable.width_mm - width_mm));
  y_mm = clampNumber(y_mm, 0, Math.max(0, usable.height_mm - height_mm));
  width_mm = clampNumber(width_mm, minW, Math.max(minW, usable.width_mm - x_mm));
  height_mm = clampNumber(height_mm, minH, Math.max(minH, usable.height_mm - y_mm));
  return {
    x_mm: Math.round(x_mm * 10) / 10,
    y_mm: Math.round(y_mm * 10) / 10,
    width_mm: Math.round(width_mm * 10) / 10,
    height_mm: Math.round(height_mm * 10) / 10,
  };
}

/** Normalise tous les frames avant save / preview / version. */
export function normalizeDefinitionFrames(definition) {
  if (!definition || typeof definition !== 'object') return definition;
  return {
    ...definition,
    components: (definition.components || []).map((c) => ({
      ...c,
      frame: clampFrameToPage(c.frame || {}, definition),
    })),
  };
}

/** Message utilisateur pour erreurs API modèles / validation frame. */
export function formatBulletinModeleError(raw, fallback = 'Opération impossible') {
  const text = String(raw || '');
  if (!text) return fallback;
  if (/frame\.(x_mm|y_mm)/i.test(text) || /greater than or equal to -5/i.test(text)) {
    return 'Un élément du bulletin est hors de la zone imprimable. Corrigez sa position avant d’enregistrer.';
  }
  if (/BulletinTemplateV1|validation error/i.test(text)) {
    return 'Le modèle contient une définition invalide. Vérifiez la position et la taille des éléments.';
  }
  if (/publié|published|archivez/i.test(text)) {
    return text;
  }
  if (/système|system|lecture seule/i.test(text)) {
    return text;
  }
  return text.length > 220 ? `${text.slice(0, 200)}…` : text;
}

/** Validation légère côté éditeur (le backend reste l'autorité). */
export function validateDefinitionClient(definition) {
  const errors = [];
  if (!definition || typeof definition !== 'object') {
    return ['Définition manquante'];
  }
  if (definition.schema_version !== 1) errors.push('schema_version doit être 1');
  const usable = usablePageMm(definition);
  const ids = new Set();
  for (const c of definition.components || []) {
    if (!c.id) errors.push('Composant sans id');
    if (ids.has(c.id)) errors.push(`Id dupliqué : ${c.id}`);
    ids.add(c.id);
    const f = c.frame || {};
    const label = c.id || c.type || 'élément';
    if (!(f.width_mm > 0) || !(f.height_mm > 0)) {
      errors.push(`${label} : taille invalide`);
    }
    if (typeof f.x_mm === 'number' && f.x_mm < -5) {
      errors.push(`${label} : hors de la zone imprimable (trop à gauche)`);
    }
    if (typeof f.y_mm === 'number' && f.y_mm < -5) {
      errors.push(`${label} : hors de la zone imprimable (trop haut)`);
    }
    if (typeof f.x_mm === 'number' && f.x_mm + (f.width_mm || 0) > usable.width_mm + 5) {
      errors.push(`${label} : dépasse la largeur de page`);
    }
    if (typeof f.y_mm === 'number' && f.y_mm + (f.height_mm || 0) > usable.height_mm + 5) {
      errors.push(`${label} : dépasse la hauteur de page`);
    }
    if (c.type === 'grades_table') {
      const cols = c.props?.columns || [];
      if (!cols.length) errors.push('Tableau des notes : aucune colonne');
      if (!cols.some((col) => col.visible !== false)) errors.push('Tableau des notes : aucune colonne visible');
    }
  }
  if (definition.data_binding?.groups_mode === 'from_template' && !(definition.data_binding.groups || []).length) {
    errors.push('groups_mode=from_template exige au moins un groupe');
  }
  for (const g of definition.data_binding?.groups || []) {
    if (!(g.groupe_numbers?.length || g.subject_ids?.length || g.subject_name_contains?.length)) {
      errors.push(`Groupe « ${g.label || g.id} » : critère de matching manquant`);
    }
  }
  return errors;
}

export function statusTone(status) {
  if (status === 'PUBLISHED') return 'emerald';
  if (status === 'ARCHIVED') return 'slate';
  return 'amber';
}

export function canManageModeles(role) {
  return role === 'admin' || role === 'direction' || role === 'superadmin';
}
