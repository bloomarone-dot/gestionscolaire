import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, WalletCards } from 'lucide-react';
import * as api from '../../api/api';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import {
  Badge, Button, DataTable, Input, Modal, PageHeader, Select, StatCard,
} from '../../components/ui';

const METHODS = [
  ['ESPECES', 'Espèces'],
  ['MOBILE_MONEY', 'Mobile Money'],
  ['VIREMENT', 'Virement'],
  ['CHEQUE', 'Chèque'],
];

const STATUS_LABELS = {
  EN_ATTENTE: { label: 'En attente', tone: 'amber' },
  PAYE: { label: 'Payé', tone: 'emerald' },
  ANNULE: { label: 'Annulé', tone: 'slate' },
};

const MOTIFS = [
  "Frais d'inscription",
  'Mensualité session',
  'Manuel / matériel',
  'Examen / certification',
  'Autre',
];

function formatXaf(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `${n.toLocaleString('fr-FR')} XAF`;
}

function studentName(row) {
  return [row.eleve_prenom, row.eleve_nom].filter(Boolean).join(' ') || `ID ${row.eleve_id}`;
}

const emptyForm = {
  eleve_id: '',
  label: MOTIFS[0],
  amount: '',
  due_date: '',
  notes: '',
};

export default function PaymentsPage() {
  const { labels: ui, profile } = useEstablishmentProfile();
  const establishmentName = profile?.nom || profile?.name || 'Établissement';

  const [paiements, setPaiements] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [encaisseId, setEncaisseId] = useState(null);
  const [encaisseMethod, setEncaisseMethod] = useState('ESPECES');
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rows, s, e] = await Promise.all([
        api.fetchPaiements(statusFilter ? { status: statusFilter } : {}),
        api.fetchTresorerieStats().catch(() => null),
        api.fetchEleves_admin().catch(() => []),
      ]);
      setPaiements(Array.isArray(rows) ? rows : []);
      setStats(s);
      setEleves(Array.isArray(e) ? e : []);
    } catch (err) {
      setError(err.message || 'Impossible de charger la trésorerie.');
      setPaiements([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const tableRows = useMemo(() => paiements.map((p) => ({
    ...p,
    student: studentName(p),
    amount_label: formatXaf(p.amount),
    due_label: p.due_date ? new Date(p.due_date).toLocaleDateString('fr-FR') : '—',
    status_label: STATUS_LABELS[p.status]?.label || p.status,
    status_tone: STATUS_LABELS[p.status]?.tone || 'slate',
  })), [paiements]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const eleve = eleves.find((x) => String(x.id) === String(form.eleve_id));
    if (!eleve) {
      setError(`Sélectionnez un ${ui.student.toLowerCase()}.`);
      setSaving(false);
      return;
    }
    try {
      await api.createPaiement({
        eleve_id: eleve.id,
        eleve_nom: eleve.nom,
        eleve_prenom: eleve.prenom,
        matricule: eleve.matricule,
        label: form.label,
        amount: Number(form.amount),
        due_date: form.due_date || null,
        notes: form.notes || null,
      });
      setModalOpen(false);
      setForm(emptyForm);
      setNotice('Échéance enregistrée.');
      await load();
    } catch (err) {
      setError(err.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function handleEncaisser() {
    if (!encaisseId) return;
    setSaving(true);
    setError('');
    try {
      await api.encaisserPaiement(encaisseId, { payment_method: encaisseMethod });
      setEncaisseId(null);
      setNotice('Paiement encaissé — reçu disponible.');
      await load();
    } catch (err) {
      setError(err.message || 'Encaissement impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRecu(row) {
    try {
      await api.downloadPaiementRecu(row.id, establishmentName);
    } catch (err) {
      setError(err.message || 'Téléchargement du reçu impossible.');
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Paiements & reçus"
        description={`Suivi des frais, échéances et encaissements — ${ui.students.toLowerCase()}.`}
        actions={(
          <Button onClick={() => { setForm(emptyForm); setModalOpen(true); }}>
            <Plus size={16} /> Nouvelle échéance
          </Button>
        )}
      />

      {notice && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="En attente" value={loading ? '…' : (stats?.pending_count ?? 0)} trend={formatXaf(stats?.pending_amount)} icon={WalletCards} tone="amber" />
        <StatCard label="Encaissé ce mois" value={loading ? '…' : (stats?.paid_month_count ?? 0)} trend={formatXaf(stats?.paid_month_amount)} icon={WalletCards} tone="emerald" />
      </div>

      <DataTable
        title="Échéances et paiements"
        filters={(
          <div className="max-w-xs">
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Statut</label>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tous</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="PAYE">Payé</option>
              <option value="ANNULE">Annulé</option>
            </Select>
          </div>
        )}
        columns={[
          { key: 'student', label: ui.student },
          { key: 'matricule', label: 'Matricule' },
          { key: 'label', label: 'Motif' },
          { key: 'amount_label', label: 'Montant' },
          { key: 'due_label', label: 'Échéance' },
          {
            key: 'status_label',
            label: 'Statut',
            render: (row) => <Badge tone={row.status_tone}>{row.status_label}</Badge>,
          },
          { key: 'receipt_number', label: 'N° reçu' },
        ]}
        rows={loading ? [] : tableRows}
        emptyMessage={loading ? 'Chargement…' : 'Aucun paiement enregistré.'}
        renderActions={(row) => (
          <div className="flex justify-end gap-2">
            {row.status === 'EN_ATTENTE' && (
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => { setEncaisseId(row.id); setEncaisseMethod('ESPECES'); }}>
                Encaisser
              </Button>
            )}
            {row.status === 'PAYE' && (
              <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => handleRecu(row)}>
                <Download size={14} /> Reçu
              </Button>
            )}
          </div>
        )}
      />

      <Modal
        title="Nouvelle échéance"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </div>
        )}
      >
        <form className="space-y-3" onSubmit={handleCreate}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{ui.student} *</label>
            <Select value={form.eleve_id} onChange={(e) => setForm((f) => ({ ...f, eleve_id: e.target.value }))} required>
              <option value="">— Choisir —</option>
              {eleves.map((e) => (
                <option key={e.id} value={e.id}>
                  {[e.nom, e.prenom].filter(Boolean).join(' ')} {e.matricule ? `(${e.matricule})` : ''}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Motif *</label>
            <Select value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}>
              {MOTIFS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Montant (XAF) *</label>
              <Input type="number" min="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Date d'échéance</label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Notes</label>
            <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </form>
      </Modal>

      <Modal
        title="Encaisser le paiement"
        open={Boolean(encaisseId)}
        onClose={() => setEncaisseId(null)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEncaisseId(null)}>Annuler</Button>
            <Button onClick={handleEncaisser} disabled={saving}>{saving ? 'Traitement…' : 'Confirmer l\'encaissement'}</Button>
          </div>
        )}
      >
        <p className="mb-3 text-sm text-slate-600">Le reçu sera généré automatiquement après confirmation.</p>
        <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Mode de paiement</label>
        <Select value={encaisseMethod} onChange={(e) => setEncaisseMethod(e.target.value)}>
          {METHODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </Modal>
    </div>
  );
}
