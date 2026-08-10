import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ModeleAssignationsPanel from './ModeleAssignationsPanel';

const api = vi.hoisted(() => ({
  fetchBulletinModeleAssignations: vi.fn(),
  fetchClasses: vi.fn(),
  fetchAnneesScolaires: vi.fn(),
  createBulletinModeleAssignation: vi.fn(),
  deleteBulletinModeleAssignation: vi.fn(),
}));

vi.mock('../../api/api', () => api);

describe('ModeleAssignationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.fetchBulletinModeleAssignations.mockResolvedValue([]);
    api.fetchClasses.mockResolvedValue([{ id: 10, nom_personnalise: '3e A' }]);
    api.fetchAnneesScolaires.mockResolvedValue([{ id: 1, libelle: '2025/2026' }]);
    api.createBulletinModeleAssignation.mockResolvedValue({ id: 1 });
    api.deleteBulletinModeleAssignation.mockResolvedValue(null);
  });

  it('bloque la création si le modèle n’est pas publié', async () => {
    render(<ModeleAssignationsPanel modeleId={5} canEdit modeleStatus="DRAFT" />);
    expect(await screen.findByText(/Publiez le modèle/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Classe assignation/i)).not.toBeInTheDocument();
  });

  it('crée une assignation classe', async () => {
    api.fetchBulletinModeleAssignations
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 9, classe_id: 10, periode: '3', priority: 100 }]);
    render(<ModeleAssignationsPanel modeleId={5} canEdit modeleStatus="PUBLISHED" />);
    await screen.findByTestId('modele-assignations-panel');
    fireEvent.change(screen.getByLabelText(/Classe assignation/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Période assignation/i), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer l'assignation/i }));
    await waitFor(() => expect(api.createBulletinModeleAssignation).toHaveBeenCalledWith(5, expect.objectContaining({
      classe_id: 10,
      periode: '3',
    })));
  });

  it('liste et supprime une assignation', async () => {
    api.fetchBulletinModeleAssignations.mockResolvedValue([
      { id: 3, classe_id: 10, level_code: null, cycle_code: null, annee_scolaire: '2025/2026', periode: '1', priority: 50 },
    ]);
    render(<ModeleAssignationsPanel modeleId={5} canEdit modeleStatus="PUBLISHED" />);
    expect(await screen.findByLabelText(/Supprimer assignation/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Supprimer assignation/i));
    await waitFor(() => expect(api.deleteBulletinModeleAssignation).toHaveBeenCalledWith(5, 3));
  });
});
