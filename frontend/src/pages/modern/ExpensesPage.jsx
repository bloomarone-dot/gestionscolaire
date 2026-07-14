import { useCallback, useEffect, useState } from 'react';
import { Plus, WalletCards } from 'lucide-react';
import * as api from '../../api/api';
import {
  Button, DataTable, Input, Modal, PageHeader, Select, StatCard,
} from '../../components/ui';

const CATEGORIES = [
  'Fournitures',
  'Salaires / primes',
  'Entretien',
  'Transport',
  'Cantine',
  'Santé',
  'Autre',
];

function formatXaf(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `${n.toLocaleString('fr-FR')} XAF`;
}

const emptyForm = { label: '', amount: '', category: CATEGORIES[0], notes: '' };

export default function ExpensesPage() {
  const [retraits, setRetraits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, s] = await Promise.all([
        api.fetchRetraits().catch(() => []),
        api.fetchTresorerieStats().catch(() => null),
      ]);
      setRetraits(Array.isArray(rows) ? rows : []);
      setStats(s);
    } catch (err) {
      setError(err.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createRetrait({
        label: form.label,
        amount: Number(form.amount),
        category: form.category,
        notes: form.notes || null,
      });
      setModalOpen(false);
      setForm(emptyForm);
      setNotice('Retrait enregistré — le solde caisse a été mis à jour automatiquement.');
      await load();
    } catch (err) {
      setError(err.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  const tableRows = retraits.map((r) => ({
    ...r,
    amount_label: formatXaf(r.amount),
    date_label: r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '—',
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Retraits & dépenses"
        description="Chaque retrait déduit automatiquement le montant du solde de caisse du mois."
        actions={(
          <Button onClick={() => { setForm(emptyForm); setModalOpen(true); }}>
            <Plus size={16} /> Nouveau retrait
          </Button>
        )}
      />

      {notice && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Encaissé ce mois"
          value={loading ? '…' : formatXaf(stats?.paid_month_amount)}
          trend={`${stats?.paid_month_count ?? 0} paiement(s)`}
          icon={WalletCards}
          tone="emerald"
        />
        <StatCard
          label="Retraits ce mois"
          value={loading ? '…' : formatXaf(stats?.withdrawal_month_amount)}
          trend={`${stats?.withdrawal_month_count ?? 0} opération(s)`}
          icon={WalletCards}
          tone="amber"
        />
        <StatCard
          label="Solde caisse (mois)"
          value={loading ? '…' : formatXaf(stats?.caisse_solde)}
          trend="Encaissements − retraits"
          icon={WalletCards}
          tone="blue"
        />
      </div>

      <DataTable
        title="Historique des retraits"
        columns={[
          { key: 'date_label', label: 'Date' },
          { key: 'label', label: 'Libellé' },
          { key: 'category', label: 'Catégorie' },
          { key: 'amount_label', label: 'Montant' },
        ]}
        rows={loading ? [] : tableRows}
        emptyMessage={loading ? 'Chargement…' : 'Aucun retrait enregistré.'}
      />

      <Modal
        title="Nouveau retrait de caisse"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Enregistrement…' : 'Confirmer le retrait'}</Button>
          </div>
        )}
      >
        <form className="space-y-3" onSubmit={handleCreate}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Libellé *</label>
            <Input required value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Montant (XAF) *</label>
              <Input type="number" min="1" required value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Catégorie</label>
              <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Notes</label>
            <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
