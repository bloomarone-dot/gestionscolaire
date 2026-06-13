import { useState } from 'react';
import { GraduationCap, Lock, Phone } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { Button, Card, Input } from '../components/ui';

export default function LoginPage() {
  const { login, loginDemo } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) {
      setError('Veuillez renseigner le telephone et le mot de passe.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <GraduationCap size={28} />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-950">EduGestion</h1>
          <p className="mt-2 text-sm text-slate-500">Connectez-vous a votre espace de gestion scolaire.</p>
        </div>

        <Card className="p-6">
          {error && <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Telephone</span>
              <span className="relative block">
                <Phone className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
                <Input className="pl-10" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ex: 699112233" autoComplete="username" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Mot de passe</span>
              <span className="relative block">
                <Lock className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
                <Input className="pl-10" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" autoComplete="current-password" />
              </span>
            </label>
            <Button className="w-full" disabled={loading}>{loading ? 'Connexion...' : 'Se connecter'}</Button>
          </form>

          <div className="mt-3 grid gap-2">
            <Button type="button" variant="secondary" className="w-full" onClick={() => loginDemo('admin')}>
              Demo admin ecole
            </Button>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="secondary" className="w-full" onClick={() => loginDemo('professeur')}>
                Demo professeur
              </Button>
              <Button type="button" variant="secondary" className="w-full" onClick={() => loginDemo('superadmin')}>
                Demo superadmin
              </Button>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-slate-500">
            Identifiant oublie ? Contactez l'administration de votre etablissement.
          </p>
        </Card>
      </div>
    </main>
  );
}
