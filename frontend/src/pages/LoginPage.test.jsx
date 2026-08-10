import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

const login = vi.fn();

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ login }),
}));

vi.mock('../utils/authToken', () => ({
  purgeInvalidAuthSession: vi.fn(),
}));

function renderLogin(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/login${search}`]}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche la marque sans identifiants ni CTA install', () => {
    renderLogin();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /BloomSchool/i })).toBeInTheDocument();
    expect(screen.getByText(/Plateforme de gestion scolaire/i)).toBeInTheDocument();
    expect(screen.getByText(/pensé pour chaque établissement/i)).toBeInTheDocument();
    expect(screen.queryByText(/Super-admin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/690000000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ChangeMe2026/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Mot de passe initial/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Installer sur le bureau/i)).not.toBeInTheDocument();
  });

  it('bascule la visibilité du mot de passe', () => {
    renderLogin();
    const input = screen.getByTestId('login-password');
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByTestId('login-toggle-password'));
    expect(input).toHaveAttribute('type', 'text');
  });

  it('appelle login avec téléphone et mot de passe', async () => {
    login.mockResolvedValueOnce({});
    renderLogin();
    fireEvent.change(screen.getByTestId('login-phone'), { target: { value: '699112233' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByTestId('login-submit'));
    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('699112233', 'secret');
    });
  });

  it('affiche une erreur si login échoue', async () => {
    login.mockRejectedValueOnce(new Error('Identifiants incorrects.'));
    renderLogin();
    fireEvent.change(screen.getByTestId('login-phone'), { target: { value: '699112233' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByTestId('login-submit'));
    expect(await screen.findByTestId('login-error')).toHaveTextContent(/Identifiants incorrects/i);
  });
});
