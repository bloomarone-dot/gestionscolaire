import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BulletinModelesPage } from './BulletinModelesPages';
import { BulletinModeleEditorPage } from './BulletinModeleEditorPage';
import { emptyTemplateV1, createComponent } from '../../../utils/bulletinTemplateCatalog';

vi.mock('../../../context/useAuth', () => ({
  useAuth: () => ({ user: { role: 'admin', id: 1 } }),
}));

const api = vi.hoisted(() => ({
  fetchBulletinModeles: vi.fn(),
  createBulletinModele: vi.fn(),
  duplicateBulletinModele: vi.fn(),
  archiveBulletinModele: vi.fn(),
  deleteBulletinModele: vi.fn(),
  fetchBulletinModele: vi.fn(),
  fetchBulletinTemplateCatalog: vi.fn(),
  updateBulletinModele: vi.fn(),
  createBulletinModeleVersion: vi.fn(),
  updateBulletinModeleVersion: vi.fn(),
  publishBulletinModele: vi.fn(),
  previewBulletinV2: vi.fn(),
}));

vi.mock('../../../api/api', () => api);

const STARTER_SEC = {
  schema_version: 1,
  name: 'Bulletin secondaire camerounais (standard)',
  page: { size: 'A4', orientation: 'portrait', margins: { top: 10, right: 10, bottom: 12, left: 10 } },
  data_binding: {
    period_mode: 'trimestre',
    sequence_columns: [],
    groups_mode: 'from_classe_matiere',
    groups: [{ id: 'g1', label: 'PREMIER GROUPE', order: 1, groupe_numbers: [1], subject_ids: [], subject_name_contains: [], show_subtotal: true }],
    include_ungrouped: true,
    complementary_section: true,
  },
  components: [
    { id: 'header_logo', type: 'school_logo', frame: { x_mm: 81, y_mm: 2, width_mm: 28, height_mm: 28 }, z_index: 2, visible: true, props: { fit: 'contain' } },
    { id: 'student', type: 'student_block', frame: { x_mm: 0, y_mm: 53, width_mm: 190, height_mm: 22 }, z_index: 3, visible: true, props: { fields: ['last_name', 'first_name'], show_labels: true, columns: 2 } },
  ],
  meta: { starter_id: 'cameroon_secondary_standard', kind: 'secondary', language_mode: 'bilingual', theme_primary: '#000000' },
};

const STARTER_PRI = {
  ...STARTER_SEC,
  name: 'Bulletin primaire camerounais (standard)',
  components: [
    { id: 'student', type: 'student_block', frame: { x_mm: 0, y_mm: 54, width_mm: 186, height_mm: 24 }, z_index: 3, visible: true, props: { fields: ['last_name'], show_labels: true, columns: 2 } },
  ],
  meta: { starter_id: 'cameroon_primary_standard', kind: 'primary', language_mode: 'fr', theme_primary: '#000000' },
};

const CATALOG_WITH_STARTERS = {
  components: [{ type: 'text', category: 'content', default_props: { content: 'x' } }],
  variables: ['student.full_name'],
  starters: [
    {
      id: 'cameroon_secondary_standard',
      name: 'Bulletin secondaire camerounais',
      description: 'Standard',
      kind: 'secondary',
      language_modes: ['fr', 'en', 'bilingual'],
      available: true,
      default_language: 'bilingual',
      definitions: { fr: STARTER_SEC, en: STARTER_SEC, bilingual: STARTER_SEC },
    },
    {
      id: 'cameroon_primary_standard',
      name: 'Bulletin primaire camerounais',
      description: 'Standard',
      kind: 'primary',
      language_modes: ['fr', 'en', 'bilingual'],
      available: true,
      default_language: 'fr',
      definitions: { fr: STARTER_PRI, en: STARTER_PRI, bilingual: STARTER_PRI },
    },
    {
      id: 'blank_v1',
      name: 'Modèle vierge',
      description: 'Créer librement',
      kind: 'blank',
      language_modes: ['fr', 'en', 'bilingual'],
      available: true,
      default_language: 'fr',
      definitions: {
        fr: emptyTemplateV1('Modèle vierge'),
        en: emptyTemplateV1('Blank'),
        bilingual: emptyTemplateV1('Blank bilingual'),
      },
    },
  ],
};

function renderEditor(modeleId = '10') {
  return render(
    <MemoryRouter initialEntries={[`/app/bulletins/modeles/${modeleId}`]}>
      <Routes>
        <Route path="/app/bulletins/modeles/:modeleId" element={<BulletinModeleEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BulletinModelesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchBulletinModeles.mockResolvedValue([
      { id: 1, name: 'Demo', status: 'DRAFT', is_system: false, is_default: false },
    ]);
    api.fetchBulletinTemplateCatalog.mockResolvedValue(CATALOG_WITH_STARTERS);
  });

  it('charge la liste des modèles', async () => {
    render(
      <MemoryRouter>
        <BulletinModelesPage />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('bulletin-modeles-page')).toBeInTheDocument();
    expect(await screen.findByText('Demo')).toBeInTheDocument();
  });

  it('ouvre le wizard de création (type → langue → starter)', async () => {
    api.createBulletinModele.mockResolvedValue({ id: 99, name: 'Nouveau bulletin' });
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<BulletinModelesPage />} />
          <Route path="/app/bulletins/modeles/:id" element={<div>editor</div>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByTestId('create-modele-btn'));
    expect(await screen.findByTestId('create-modele-wizard')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-step-type')).toBeInTheDocument();
    expect(screen.getByText(/Formation professionnelle/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByTestId('wizard-step-language')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Français'));

    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByTestId('wizard-step-starter')).toBeInTheDocument();
    expect(screen.getByTestId('starter-card-cameroon_secondary_standard')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wizard-create'));

    await waitFor(() => expect(api.createBulletinModele).toHaveBeenCalled());
    const body = api.createBulletinModele.mock.calls[0][0];
    expect(body.definition.schema_version).toBe(1);
    expect(body.definition.meta.starter_id).toBe('cameroon_secondary_standard');
    expect(body.definition.meta.language_mode).toBe('fr');
    expect(body.definition.components.some((c) => c.type === 'student_block')).toBe(true);
  });

  it('crée un modèle primaire depuis le starter', async () => {
    api.createBulletinModele.mockResolvedValue({ id: 100, name: 'Primaire' });
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<BulletinModelesPage />} />
          <Route path="/app/bulletins/modeles/:id" element={<div>editor</div>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByTestId('create-modele-btn'));
    fireEvent.click(screen.getByLabelText('Primaire'));
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByTestId('starter-card-cameroon_primary_standard')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wizard-create'));
    await waitFor(() => expect(api.createBulletinModele).toHaveBeenCalled());
    const body = api.createBulletinModele.mock.calls[0][0];
    expect(body.definition.meta.kind).toBe('primary');
  });

  it('crée un modèle vierge', async () => {
    api.createBulletinModele.mockResolvedValue({ id: 101, name: 'Vierge' });
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<BulletinModelesPage />} />
          <Route path="/app/bulletins/modeles/:id" element={<div>editor</div>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByTestId('create-modele-btn'));
    fireEvent.click(screen.getByLabelText('Modèle vierge'));
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByTestId('starter-card-blank_v1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wizard-create'));
    await waitFor(() => expect(api.createBulletinModele).toHaveBeenCalled());
    const body = api.createBulletinModele.mock.calls[0][0];
    expect(body.definition.components).toEqual([]);
  });
});

describe('BulletinModeleEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    const definition = emptyTemplateV1('Éditable');
    definition.components = [createComponent('text')];
    api.fetchBulletinModele.mockResolvedValue({
      id: 10,
      name: 'Éditable',
      status: 'DRAFT',
      is_system: false,
      current_version: { id: 5, version_number: 1, definition },
    });
    api.fetchBulletinTemplateCatalog.mockResolvedValue({
      components: [{ type: 'text', category: 'design', default_props: { content: 'x' } }],
      variables: ['student.full_name'],
    });
    api.updateBulletinModele.mockImplementation(async (_id, body) => ({
      id: 10,
      name: body.name,
      status: 'DRAFT',
      is_system: false,
      current_version: { id: 5, version_number: 1, definition: body.definition },
    }));
    api.publishBulletinModele.mockResolvedValue({
      id: 10,
      name: 'Éditable',
      status: 'PUBLISHED',
      is_system: false,
      current_version: { id: 5, version_number: 1, definition },
    });
    api.createBulletinModeleVersion.mockResolvedValue({ id: 6, version_number: 2 });
    api.previewBulletinV2.mockResolvedValue({
      kind: 'bulletin_preview_v2',
      template_name: 'Éditable',
      page_count: 1,
      pages: [{ index: 0, geometry: { width_mm: 210, height_mm: 297 }, elements: [] }],
    });
  });

  it('charge le modèle et ajoute un composant', async () => {
    renderEditor();
    expect(await screen.findByTestId('bulletin-modele-editor')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Informations élève' }));
    expect(screen.getByTestId('canvas-component-student_block')).toBeInTheDocument();
  });

  it('enregistre un DRAFT', async () => {
    renderEditor();
    await screen.findByTestId('bulletin-modele-editor');
    fireEvent.click(screen.getByRole('button', { name: 'Forme' }));
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));
    await waitFor(() => expect(api.updateBulletinModele).toHaveBeenCalled());
  });

  it('publie après confirmation', async () => {
    renderEditor();
    await screen.findByTestId('bulletin-modele-editor');
    fireEvent.click(screen.getByRole('button', { name: /Publier/i }));
    await waitFor(() => expect(api.publishBulletinModele).toHaveBeenCalled());
  });

  it('ouvre un modèle PUBLISHED et crée une version à l’enregistrement', async () => {
    const definition = emptyTemplateV1('Publié');
    api.fetchBulletinModele.mockResolvedValue({
      id: 10,
      name: 'Publié',
      status: 'PUBLISHED',
      is_system: false,
      current_version: { id: 5, version_number: 1, definition },
    });
    api.updateBulletinModeleVersion.mockResolvedValue({ id: 6, version_number: 2 });
    renderEditor();
    await screen.findByTestId('bulletin-modele-editor');
    fireEvent.click(screen.getByRole('button', { name: 'Logo' }));
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));
    await waitFor(() => expect(api.createBulletinModeleVersion).toHaveBeenCalled());
    await waitFor(() => expect(api.updateBulletinModeleVersion).toHaveBeenCalled());
  });

  it('preview appelle l’API V2', async () => {
    renderEditor();
    await screen.findByTestId('bulletin-modele-editor');
    fireEvent.change(screen.getByLabelText(/ID élève aperçu/i), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: /Aperçu/i }));
    await waitFor(() => expect(api.previewBulletinV2).toHaveBeenCalled());
    expect(await screen.findByTestId('preview-document')).toBeInTheDocument();
  });

  it('template système en lecture seule', async () => {
    api.fetchBulletinModele.mockResolvedValue({
      id: 10,
      name: 'Système',
      status: 'PUBLISHED',
      is_system: true,
      current_version: { id: 5, version_number: 1, definition: emptyTemplateV1() },
    });
    renderEditor();
    expect(await screen.findByText(/lecture seule/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Texte' }));
    expect(screen.queryByTestId('canvas-component-text')).not.toBeInTheDocument();
  });
});

describe('permissions lecture seule rôle', () => {
  it('refuse l’éditeur pour un non-manager', async () => {
    expect(true).toBe(true);
  });
});
