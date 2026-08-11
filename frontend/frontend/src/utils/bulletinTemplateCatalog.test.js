import { describe, expect, it } from 'vitest';
import {
  canManageModeles,
  createComponent,
  emptyTemplateV1,
  pageSizeMm,
  validateDefinitionClient,
  COMPONENT_META,
  PALETTE_CATEGORY_ORDER,
  clampFrameToPage,
  normalizeDefinitionFrames,
  usablePageMm,
  formatBulletinModeleError,
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

  it('clampFrameToPage empêche x_mm négatif hors schéma', () => {
    const t = emptyTemplateV1();
    const clamped = clampFrameToPage({ x_mm: -26.4, y_mm: 10, width_mm: 30, height_mm: 20 }, t);
    expect(clamped.x_mm).toBe(0);
    expect(clamped.y_mm).toBe(10);
    expect(clamped.width_mm).toBe(30);
  });

  it('normalizeDefinitionFrames corrige tous les composants', () => {
    const t = emptyTemplateV1();
    t.components = [
      createComponent('text', null, { frame: { x_mm: -26.4, y_mm: -10, width_mm: 40, height_mm: 10 } }),
      createComponent('school_logo', null, { frame: { x_mm: 500, y_mm: 10, width_mm: 30, height_mm: 30 } }),
    ];
    const n = normalizeDefinitionFrames(t);
    expect(n.components[0].frame.x_mm).toBeGreaterThanOrEqual(0);
    expect(n.components[0].frame.y_mm).toBeGreaterThanOrEqual(0);
    expect(n.components[1].frame.x_mm + n.components[1].frame.width_mm)
      .toBeLessThanOrEqual(usablePageMm(t).width_mm + 0.1);
    expect(validateDefinitionClient(n)).toEqual([]);
  });

  it('validateDefinitionClient détecte x_mm < -5', () => {
    const t = emptyTemplateV1();
    t.components = [createComponent('text', null, { frame: { x_mm: -26.4, y_mm: 0, width_mm: 20, height_mm: 10 } })];
    const errors = validateDefinitionClient(t);
    expect(errors.some((e) => e.includes('hors de la zone'))).toBe(true);
  });

  it('formatBulletinModeleError humanise les erreurs Pydantic frame', () => {
    const msg = formatBulletinModeleError(
      '1 validation error for BulletinTemplateV1\ncomponents.3.frame.x_mm\n  Input should be greater than or equal to -5 [type=greater_than_equal, input_value=-26.4]',
    );
    expect(msg).toMatch(/zone imprimable/i);
    expect(msg).not.toMatch(/BulletinTemplateV1/);
  });
});
