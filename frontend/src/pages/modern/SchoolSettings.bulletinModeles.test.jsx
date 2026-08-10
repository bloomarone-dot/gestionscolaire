import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SettingsPage } from './SchoolSettings';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ user: { role: 'admin', id: 1 }, selectedSchool: null }),
}));

const api = vi.hoisted(() => ({
  fetchMySchool: vi.fn(),
  updateSchool: vi.fn(),
  updateSchoolProfile: vi.fn(),
  getSchool: vi.fn(),
  fetchClasses: vi.fn(),
  fetchFeeSchedules: vi.fn(),
  saveFeeSchedule: vi.fn(),
}));

vi.mock('../../api/api', () => api);

const schoolFixture = {
  id: 1,
  name: 'Collège Test',
  city: 'Yaoundé',
  address: '',
  phone: '',
  logo_url: '',
  bulletin_motto: '',
  bulletin_po_box: '',
  bulletin_delegation_regional: '',
  bulletin_delegation_departementale: '',
  bulletin_next_term_note: '',
  bulletin_theme: {},
  bulletin_layout_profile: { header_style: 'bilingual', confidence: 0.8 },
  bulletin_reference_url: null,
  bulletin_appreciation_scales: null,
  subsystems: ['FRANCOPHONE'],
  teaching_types: ['GENERAL'],
  channels: ['INTERNAL'],
  operational_settings: {},
};

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/app/settings']}>
      <Routes>
        <Route path="/app/settings" element={<SettingsPage />} />
        <Route path="/app/bulletins/modeles" element={<div data-testid="modeles-page">Modèles</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SchoolSettings — modèles de bulletin (UX V2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchMySchool.mockResolvedValue(schoolFixture);
    api.updateSchool.mockResolvedValue(schoolFixture);
    api.fetchClasses.mockResolvedValue([]);
    api.fetchFeeSchedules.mockResolvedValue([]);
  });

  it('n’affiche plus l’ancien import PDF/détection', async () => {
    renderSettings();
    await screen.findByTestId('school-settings-bulletin-modeles');
    expect(screen.queryByText(/Importer un bulletin modèle/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Modèle de bulletin \(import\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/détection automatique/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Analyse en cours/i)).not.toBeInTheDocument();
    expect(document.querySelector('input[accept*="application/pdf"]')).toBeNull();
  });

  it('affiche le CTA vers les modèles V2', async () => {
    renderSettings();
    const btn = await screen.findByTestId('manage-bulletin-modeles');
    expect(btn).toHaveTextContent(/Gérer mes modèles de bulletin/i);
    expect(screen.getByText(/éditeur visuel/i)).toBeInTheDocument();
  });

  it('redirige vers /app/bulletins/modeles', async () => {
    renderSettings();
    fireEvent.click(await screen.findByTestId('manage-bulletin-modeles'));
    expect(await screen.findByTestId('modeles-page')).toBeInTheDocument();
  });

  it('conserve les paramètres établissement (logo / en-tête)', async () => {
    renderSettings();
    await screen.findByDisplayValue('Collège Test');
    expect(screen.getByText(/En-tete du bulletin/i)).toBeInTheDocument();
    expect(screen.getByText(/Telecharger le logo/i)).toBeInTheDocument();
    expect(screen.getByText(/Apparence du bulletin par section/i)).toBeInTheDocument();
  });

  it('préserve bulletin_layout_profile à l’enregistrement', async () => {
    renderSettings();
    await screen.findByDisplayValue('Collège Test');
    fireEvent.click(screen.getByRole('button', { name: /^Enregistrer$/ }));
    await waitFor(() => expect(api.updateSchool).toHaveBeenCalled());
    const payload = api.updateSchool.mock.calls[0][1];
    expect(payload.bulletin_layout_profile).toEqual(schoolFixture.bulletin_layout_profile);
  });
});
