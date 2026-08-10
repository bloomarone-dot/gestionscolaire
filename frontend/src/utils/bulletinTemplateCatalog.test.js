import { describe, expect, it } from 'vitest';
import {
  canManageModeles,
  createComponent,
  emptyTemplateV1,
  pageSizeMm,
  validateDefinitionClient,
  COMPONENT_META,
  PALETTE_CATEGORY_ORDER,
} from './bulletinTemplateCatalog';

describe('bulletinTemplateCatalog', () => {
  it('crée un template V1 vide valide', () => {
    const t = emptyTemplateV1('Test');
    expect(t.schema_version).toBe(1);
    expect(t.page.size).toBe('A4');
    expect(t.components).toEqual([]);
    expect(validateDefinitionClient(t)).toEqual([]);
  });

  it('ajoute un composant grades_table avec colonnes', () => {
    const c = createComponent('grades_table');
    expect(c.type).toBe('grades_table');
    expect(c.id).toMatch(/^grades_table_/);
    expect(c.frame.width_mm).toBeGreaterThan(0);
    expect(c.props.columns.length).toBeGreaterThan(3);
  });

  it('détecte un composant hors page', () => {
    const t = emptyTemplateV1();
    t.components = [createComponent('text', null, {
      frame: { x_mm: 0, y_mm: 0, width_mm: 500, height_mm: 10 },
    })];
    const errors = validateDefinitionClient(t);
    expect(errors.some((e) => e.includes('largeur'))).toBe(true);
  });

  it('page landscape change les dimensions mm', () => {
    const t = emptyTemplateV1();
    t.page.orientation = 'landscape';
    expect(pageSizeMm(t)).toEqual({ width_mm: 297, height_mm: 210 });
  });

  it('permissions modèles', () => {
    expect(canManageModeles('admin')).toBe(true);
    expect(canManageModeles('direction')).toBe(true);
    expect(canManageModeles('enseignant')).toBe(false);
    expect(canManageModeles('secretaire')).toBe(false);
  });

  it('refuse groups_mode from_template sans groupes', () => {
    const t = emptyTemplateV1();
    t.data_binding.groups_mode = 'from_template';
    t.data_binding.groups = [];
    expect(validateDefinitionClient(t).some((e) => e.includes('from_template'))).toBe(true);
  });

  it('organise la palette Structure / Contenu / Mise en page', () => {
    expect(PALETTE_CATEGORY_ORDER).toEqual(['structure', 'content', 'layout']);
    const cats = new Set(COMPONENT_META.map((c) => c.category));
    expect(cats.has('structure')).toBe(true);
    expect(cats.has('content')).toBe(true);
    expect(cats.has('layout')).toBe(true);
    expect(COMPONENT_META.find((c) => c.type === 'grades_table')?.category).toBe('structure');
    expect(COMPONENT_META.find((c) => c.type === 'text')?.category).toBe('content');
  });
});
