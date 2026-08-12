import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Phone } from 'lucide-react';
import * as api from '../api/api';
import { Badge, Button, Card, Input } from '../components/ui';
import { PIECE_DEFS, parsePieces } from '../utils/studentPieces';
import { APP_NAME } from '../utils/brand';

const PENSION_LABELS = {
  SOLDE: { label: 'Soldé', tone: 'emerald' },
  EN_REGLE: { label: 'En règle', tone: 'blue' },
  EN_RETARD: { label: 'En retard', tone: 'rose' },
  NON_CONFIGURE: { label: 'Frais non configurés', tone: 'slate' },
};

function formatXaf(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `${n.toLocaleString('fr-FR')} XAF`;
}

export default function ParentPortalPage() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);

  async function loadDashboard() {
    const data = await api.fetchParentDashboard();
    setDashboard(data);
  }

  useEffect(() => {
    if (!api.getParentAccessToken()) return;
    loadDashboard().catch(() => api.clearParentAccessToken());
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.parentLogin(phone.trim(), pin.trim());
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    api.clearParentAccessToken();
    setDashboard(null);
  }

  if (!dashboard) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4" data-testid="parent-portal">
        <Card className="w-full max-w-md p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[#B8863B]">{APP_NAME}</p>
          <h1 className="mt-2 text-xl font-extrabold text-slate-950">Espace parent</h1>
          <p className="mt-1 text-sm text-slate-500">Téléphone et code fournis par l'établissement.</p>
          <form className="mt-6 space-y-4" onSubmit={handleLogin}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Téléphone</span>
              <span className="relative block">
                <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input className="pl-10" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" required />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Code à 6 chiffres</span>
              <span className="relative block">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input className="pl-10 tracking-widest" value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" required />
              </span>
            </label>
            {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
            <Button className="w-full" disabled={loading}>{loading ? 'Connexion…' : 'Entrer'}</Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Personnel de l'école ? <Link className="font-semibold text-[#101F3C]" to="/login">Connexion staff</Link>
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8" data-testid="parent-dashboard">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#B8863B]">{APP_NAME}</p>
            <h1 className="text-xl font-extrabold text-slate-950">Espace parent</h1>
            <p className="text-sm text-slate-500">{dashboard.phone}</p>
          </div>
          <Button variant="secondary" onClick={logout}>Déconnexion</Button>
        </div>
        {(dashboard.enfants || []).map((child) => {
          const pension = child.pension;
          const statusMeta = PENSION_LABELS[pension?.status] || PENSION_LABELS.NON_CONFIGURE;
          const pieces = parsePieces(child.pieces);
          return (
            <Card key={child.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{[child.prenom, child.nom].filter(Boolean).join(' ')}</h2>
                  <p className="text-sm text-slate-500">{child.matricule} · {child.classe_nom || 'Classe —'}</p>
                </div>
                <Badge tone={child.statut === 'INSCRIT' ? 'emerald' : 'slate'}>{child.statut}</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">Scolarité</p>
                  <p className="mt-1 font-bold">{formatXaf(pension?.reste)} restant</p>
                  <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">Versé</p>
                  <p className="mt-1 font-bold">{formatXaf(pension?.total_paid)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">Absences</p>
                  <p className="mt-1 font-bold">{child.absences?.length || 0}</p>
                </div>
              </div>
              {pension?.buckets?.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  {pension.buckets.map((b) => (
                    <li key={b.fee_type}>{b.label} : {formatXaf(b.paid)} / {formatXaf(b.due)}</li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Dossier</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PIECE_DEFS.map((p) => (
                    <Badge key={p.key} tone={pieces[p.key] === 'recu' ? 'emerald' : 'rose'}>
                      {p.label} {pieces[p.key] === 'recu' ? 'reçu' : 'manquant'}
                    </Badge>
                  ))}
                </div>
              </div>
              {child.absences?.length > 0 && (
                <ul className="mt-3 text-sm text-slate-600">
                  {child.absences.slice(0, 5).map((a) => (
                    <li key={a.id}>Absence le {a.jour}</li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
        {(!dashboard.enfants || dashboard.enfants.length === 0) && (
          <p className="text-sm text-slate-500">Aucun enfant lié à ce numéro.</p>
        )}
      </div>
    </main>
  );
}
