import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Download, Smartphone } from 'lucide-react';
import * as api from '../api/api';
import { Button, Card, Input, Select } from '../components/ui';

function formatXaf(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `${n.toLocaleString('fr-FR')} XAF`;
}

export default function ParentPaymentPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState('MTN_MOMO');
  const [checkout, setCheckout] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchPublicPaiement(token);
      setInfo(data);
    } catch (err) {
      setError(err.message || 'Lien de paiement invalide.');
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handleInitiate(e) {
    e.preventDefault();
    setError('');
    setConfirming(true);
    try {
      const result = await api.initierPaiementParent(token, { parent_phone: phone, provider });
      setCheckout(result);
      if (result.mode !== 'sandbox' && result.checkout_url) {
        window.location.href = result.checkout_url;
      }
    } catch (err) {
      setError(err.message || 'Impossible de démarrer le paiement.');
    } finally {
      setConfirming(false);
    }
  }

  async function handleConfirmSandbox() {
    setConfirming(true);
    setError('');
    try {
      const updated = await api.confirmerPaiementParent(token);
      setInfo(updated);
      setCheckout(null);
    } catch (err) {
      setError(err.message || 'Confirmation impossible.');
    } finally {
      setConfirming(false);
    }
  }

  async function handleDownloadRecu() {
    try {
      await api.downloadPublicPaiementRecu(token);
    } catch (err) {
      setError(err.message || 'Téléchargement du reçu impossible.');
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Chargement du paiement…</p>
      </main>
    );
  }

  if (!info) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md p-6 text-center">
          <p className="text-rose-600">{error || 'Lien invalide.'}</p>
        </Card>
      </main>
    );
  }

  const isPaid = info.status === 'PAYE';

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <Smartphone size={28} />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Paiement scolaire</h1>
          <p className="mt-1 text-sm text-slate-500">Mobile Money — MTN ou Orange</p>
        </div>

        <Card className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          )}

          <dl className="mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Élève</dt>
              <dd className="font-semibold">{info.student}</dd>
            </div>
            {info.matricule && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Matricule</dt>
                <dd>{info.matricule}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Motif</dt>
              <dd>{info.label}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
              <dt className="font-semibold">Montant</dt>
              <dd className="font-bold text-emerald-700">{formatXaf(info.amount)}</dd>
            </div>
          </dl>

          {isPaid ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
              <p className="mt-3 font-semibold text-emerald-800">Paiement enregistré</p>
              {info.receipt_number && (
                <p className="mt-1 text-sm text-slate-500">N° reçu : {info.receipt_number}</p>
              )}
              <Button className="mt-4" onClick={handleDownloadRecu}>
                <Download size={16} /> Télécharger le reçu
              </Button>
            </div>
          ) : checkout ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-700">Suivez ces instructions :</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                {checkout.instructions?.map((line) => <li key={line}>{line}</li>)}
              </ul>
              {(checkout.sandbox || checkout.mode === 'orange_ussd') && (
                <Button className="w-full" onClick={handleConfirmSandbox} disabled={confirming}>
                  {confirming
                    ? 'Vérification…'
                    : checkout.sandbox
                      ? "J'ai payé — confirmer (mode test)"
                      : 'J\'ai validé sur mon téléphone — vérifier le paiement'}
                </Button>
              )}
              <p className="text-xs text-slate-400">{checkout.message}</p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleInitiate}>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Votre numéro Mobile Money *
                </span>
                <Input
                  required
                  placeholder="Ex: 699112233"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Opérateur *
                </span>
                <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="MTN_MOMO">MTN Mobile Money</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                </Select>
              </label>
              <Button type="submit" className="w-full" disabled={confirming}>
                {confirming ? 'Préparation…' : 'Payer via Mobile Money'}
              </Button>
              <p className="text-xs text-slate-400">
                Le paiement est tracé automatiquement — plus besoin de passer par la caisse en espèces.
              </p>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
