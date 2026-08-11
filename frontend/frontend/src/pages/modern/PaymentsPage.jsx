import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircle, Copy, Download, Link2, ListChecks, Plus, Wallet, WalletCards,
} from 'lucide-react';
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

const RETRAIT_CATEGORIES = [
  'Salaires', 'Fournitures', 'Cantine', 'Transport', 'Entretien', 'Loyer', 'Divers',
];

const TABS = [
  ['paiement', 'Paiement', WalletCards],
  ['caisse', 'Caisse', Wallet],
  ['suivi', 'Suivi des paiements', ListChecks],
];

function formatXaf(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `${n.toLocaleString('fr-FR')} XAF`;
}

function studentName(row) {
  return [row.eleve_prenom, row.eleve_nom].filter(Boolean).join(' ') || `ID ${row.eleve_id}`;
}

const emptyEcheance = () => ({ eleve_id: '', label: "Frais d'inscription", amount: '', due_date: '', notes: '' });
const emptyRetrait = () => ({ label: '', amount: '', category: RETRAIT_CATEGORIES[0], notes: '' });

export default function PaymentsPage() {
  const { labels: ui, profile } = useEstablishmentProfile();
  const establishmentName = profile?.nom || profile?.name || 'Établissement';

  const [tab, setTab] = useState('paiement');
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const classesById = useMemo(() => {
    const map = {};
    classes.forEach((c) => { map[c.id] = c.nom || c.nom_personnalise || `Classe ${c.id}`; });
    return map;
  }, [classes]);
  const schedulesByClasse = useMemo(() => {
    const map = {};
    schedules.forEach((s) => { map[s.classe_id] = s; });
    return map;
  }, [schedules]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, e, cls, fees] = await Promise.all([
        api.fetchTresorerieStats().catch(() => null),
        api.fetchEleves_admin().catch(() => []),
        api.fetchClasses().catch(() => []),
        api.fetchFeeSchedules().catch(() => []),
      ]);
      setStats(s);
      setEleves(Array.isArray(e) ? e : []);
      setClasses(Array.isArray(cls) ? cls : []);
      setSchedules(Array.isArray(fees) ? fees : []);
    } catch (err) {
      setError(err.message || 'Impossible de charger la trésorerie.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (msg) => { setNotice(msg); setError(''); };
  const fail = (msg) => { setError(msg); setNotice(''); };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Paiements & caisse"
        description="Encaissements de scolarité (inscription + 3 tranches), suivi des élèves et contrôle de la caisse."
      />

      {notice && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Encaissé ce mois" value={loading ? '…' : (stats?.paid_month_count ?? 0)} trend={formatXaf(stats?.paid_month_amount)} icon={WalletCards} tone="emerald" />
        <StatCard label="En ligne (Mobile Money)" value={loading ? '…' : (stats?.online_month_count ?? 0)} trend={formatXaf(stats?.online_month_amount)} icon={WalletCards} tone="blue" />
        <StatCard label="Retraits ce mois" value={loading ? '…' : (stats?.withdrawal_month_count ?? 0)} trend={formatXaf(stats?.withdrawal_month_amount)} icon={ArrowDownCircle} tone="rose" />
        <StatCard label="Solde caisse" value={loading ? '…' : formatXaf(stats?.caisse_solde)} trend="Encaissements − retraits" icon={Wallet} tone="slate" />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setTab(key); setNotice(''); setError(''); }}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition ${
              tab === key
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'paiement' && (
        <PaiementTab
          ui={ui}
          eleves={eleves}
          classesById={classesById}
          establishmentName={establishmentName}
          onFlash={flash}
          onFail={fail}
          onChanged={load}
        />
      )}
      {tab === 'caisse' && (
        <CaisseTab stats={stats} onFlash={flash} onFail={fail} onChanged={load} />
      )}
      {tab === 'suivi' && (
        <SuiviTab
          ui={ui}
          eleves={eleves}
          classesById={classesById}
          schedulesByClasse={schedulesByClasse}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Onglet Paiement ───────────────────────── */
function PaiementTab({ ui, eleves, classesById, establishmentName, onFlash, onFail, onChanged }) {
  const [eleveId, setEleveId] = useState('');
  const [resume, setResume] = useState(null);
  const [loadingResume, setLoadingResume] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('ESPECES');
  const [paying, setPaying] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

  const [echeances, setEcheances] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [echModal, setEchModal] = useState(false);
  const [echForm, setEchForm] = useState(emptyEcheance);
  const [encaisseId, setEncaisseId] = useState(null);
  const [encaisseMethod, setEncaisseMethod] = useState('ESPECES');
  const [linkModal, setLinkModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const selectedEleve = useMemo(
    () => eleves.find((e) => String(e.id) === String(eleveId)) || null,
    [eleves, eleveId],
  );
  const classeId = selectedEleve?.classe_id ?? null;

  const loadResume = useCallback(async () => {
    if (!eleveId) { setResume(null); return; }
    setLoadingResume(true);
    try {
      const data = await api.fetchPensionResume(eleveId, classeId);
      setResume(data);
    } catch (err) {
      onFail(err.message || 'Impossible de charger la situation de scolarité.');
    } finally {
      setLoadingResume(false);
    }
  }, [eleveId, classeId, onFail]);

  useEffect(() => { loadResume(); }, [loadResume]);

  const loadEcheances = useCallback(async () => {
    try {
      const rows = await api.fetchPaiements(statusFilter ? { status: statusFilter } : {});
      setEcheances(Array.isArray(rows) ? rows : []);
    } catch { setEcheances([]); }
  }, [statusFilter]);

  useEffect(() => { loadEcheances(); }, [loadEcheances]);

  async function handlePay(e) {
    e.preventDefault();
    if (!selectedEleve) { onFail('Sélectionnez un élève.'); return; }
    const value = Number(amount);
    if (!value || value <= 0) { onFail('Saisissez un montant valide.'); return; }
    setPaying(true);
    try {
      const res = await api.payerPension({
        eleve_id: selectedEleve.id,
        classe_id: classeId,
        eleve_nom: [selectedEleve.nom, selectedEleve.prenom].filter(Boolean).join(' '),
        matricule: selectedEleve.matricule || null,
        amount: value,
        payment_method: method,
        paid_online: method === 'MOBILE_MONEY',
      });
      setResume(res.summary);
      setLastReceipt(res);
      setAmount('');
      const parts = (res.allocations || []).map((a) => `${a.label}: ${formatXaf(a.amount)}`).join(' · ');
      onFlash(`Versement enregistré (${res.receipt_number}). ${parts}. Reste à payer : ${formatXaf(res.summary?.reste)}.`);
      onChanged();
    } catch (err) {
      onFail(err.message || 'Enregistrement du versement impossible.');
    } finally {
      setPaying(false);
    }
  }

  async function handleCreateEcheance(e) {
    e.preventDefault();
    const eleve = eleves.find((x) => String(x.id) === String(echForm.eleve_id));
    if (!eleve) { onFail('Sélectionnez un élève.'); return; }
    setBusy(true);
    try {
      await api.createPaiement({
        eleve_id: eleve.id,
        eleve_nom: eleve.nom,
        eleve_prenom: eleve.prenom,
        matricule: eleve.matricule,
        label: echForm.label,
        amount: Number(echForm.amount),
        due_date: echForm.due_date || null,
        notes: echForm.notes || null,
      });
      setEchModal(false);
      setEchForm(emptyEcheance());
      onFlash('Échéance créée.');
      loadEcheances();
    } catch (err) {
      onFail(err.message || 'Création impossible.');
    } finally { setBusy(false); }
  }

  async function handleEncaisser() {
    if (!encaisseId) return;
    setBusy(true);
    try {
      await api.encaisserPaiement(encaisseId, { payment_method: encaisseMethod });
      setEncaisseId(null);
      onFlash('Paiement encaissé — reçu disponible.');
      loadEcheances();
      onChanged();
    } catch (err) {
      onFail(err.message || 'Encaissement impossible.');
    } finally { setBusy(false); }
  }

  async function handleRecu(row) {
    try { await api.downloadPaiementRecu(row.id, establishmentName); }
    catch (err) { onFail(err.message || 'Téléchargement du reçu impossible.'); }
  }

  async function handleParentLink(row) {
    try { setLinkModal(await api.genererLienParentPaiement(row.id)); }
    catch (err) { onFail(err.message || 'Impossible de générer le lien parent.'); }
  }

  async function copyLink(url) {
    try { await navigator.clipboard.writeText(url); onFlash('Lien copié — envoyez-le au parent (WhatsApp / SMS).'); }
    catch { onFlash('Copiez le lien manuellement.'); }
  }

  const echRows = useMemo(() => echeances.map((p) => ({
    ...p,
    student: studentName(p),
    amount_label: formatXaf(p.amount),
    due_label: p.due_date ? new Date(p.due_date).toLocaleDateString('fr-FR') : '—',
    status_label: STATUS_LABELS[p.status]?.label || p.status,
    status_tone: STATUS_LABELS[p.status]?.tone || 'slate',
  })), [echeances]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-800">Versement de scolarité (affectation automatique)</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{ui.student} *</label>
            <Select value={eleveId} onChange={(e) => { setEleveId(e.target.value); setLastReceipt(null); }}>
              <option value="">— Choisir —</option>
              {eleves.map((e) => (
                <option key={e.id} value={e.id}>
                  {[e.nom, e.prenom].filter(Boolean).join(' ')}{e.matricule ? ` (${e.matricule})` : ''}
                  {e.classe_id ? ` — ${classesById[e.classe_id] || ''}` : ''}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end text-sm text-slate-500">
            {selectedEleve && (classeId
              ? <span>Classe : <b className="text-slate-700">{classesById[classeId] || `#${classeId}`}</b></span>
              : <span className="text-amber-600">Aucune classe rattachée — grille de frais indisponible.</span>)}
          </div>
        </div>

        {loadingResume && <p className="mt-3 text-sm text-slate-500">Chargement de la situation…</p>}

        {resume && (
          <div className="mt-4 space-y-4">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Poste</th>
                    <th className="px-3 py-2 text-right">Montant dû</th>
                    <th className="px-3 py-2 text-right">Versé</th>
                    <th className="px-3 py-2 text-right">Reste</th>
                  </tr>
                </thead>
                <tbody>
                  {resume.buckets.map((b) => (
                    <tr key={b.fee_type} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-700">{b.label}</td>
                      <td className="px-3 py-2 text-right">{formatXaf(b.due)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatXaf(b.paid)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${Number(b.reste) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {formatXaf(b.reste)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr className="border-t border-slate-200 font-bold text-slate-800">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{formatXaf(resume.total_due)}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{formatXaf(resume.total_paid)}</td>
                    <td className={`px-3 py-2 text-right ${Number(resume.reste) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {formatXaf(resume.reste)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={resume.status === 'SOLDE' ? 'emerald' : resume.en_regle ? 'blue' : 'rose'}>
                {resume.status === 'SOLDE' ? 'Soldé'
                  : resume.status === 'EN_REGLE' ? 'En règle'
                  : resume.status === 'NON_CONFIGURE' ? 'Frais non configurés'
                  : 'En retard'}
              </Badge>
              {Number(resume.reste) > 0 && (
                <span className="text-sm text-slate-600">Reste à payer : <b className="text-rose-600">{formatXaf(resume.reste)}</b></span>
              )}
            </div>

            <form onSubmit={handlePay} className="flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-3">
              <div className="w-40">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Montant versé *</label>
                <Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="w-44">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Mode</label>
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </div>
              <Button type="submit" disabled={paying}>{paying ? 'Enregistrement…' : 'Encaisser le versement'}</Button>
            </form>

            {lastReceipt && (
              <p className="text-xs text-slate-500">
                Dernier reçu : <b>{lastReceipt.receipt_number}</b> — affectation automatique inscription → tranches.
              </p>
            )}
          </div>
        )}
      </div>

      <DataTable
        title="Autres échéances & liens parents"
        filters={(
          <div className="flex items-end gap-3">
            <div className="max-w-xs">
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Statut</label>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tous</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="PAYE">Payé</option>
                <option value="ANNULE">Annulé</option>
              </Select>
            </div>
            <Button variant="secondary" onClick={() => { setEchForm(emptyEcheance()); setEchModal(true); }}>
              <Plus size={16} /> Nouvelle échéance
            </Button>
          </div>
        )}
        columns={[
          { key: 'student', label: ui.student },
          { key: 'matricule', label: 'Matricule' },
          { key: 'label', label: 'Motif' },
          { key: 'amount_label', label: 'Montant' },
          { key: 'due_label', label: 'Échéance' },
          { key: 'status_label', label: 'Statut', render: (row) => <Badge tone={row.status_tone}>{row.status_label}</Badge> },
          { key: 'receipt_number', label: 'N° reçu' },
        ]}
        rows={echRows}
        emptyMessage="Aucune échéance ad-hoc."
        renderActions={(row) => (
          <div className="flex justify-end gap-2">
            {row.status === 'EN_ATTENTE' && (
              <>
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => handleParentLink(row)}>
                  <Link2 size={14} /> Lien parent
                </Button>
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => { setEncaisseId(row.id); setEncaisseMethod('ESPECES'); }}>
                  Encaisser
                </Button>
              </>
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
        open={echModal}
        onClose={() => setEchModal(false)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEchModal(false)}>Annuler</Button>
            <Button onClick={handleCreateEcheance} disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </div>
        )}
      >
        <form className="space-y-3" onSubmit={handleCreateEcheance}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{ui.student} *</label>
            <Select value={echForm.eleve_id} onChange={(e) => setEchForm((f) => ({ ...f, eleve_id: e.target.value }))} required>
              <option value="">— Choisir —</option>
              {eleves.map((e) => (
                <option key={e.id} value={e.id}>{[e.nom, e.prenom].filter(Boolean).join(' ')} {e.matricule ? `(${e.matricule})` : ''}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Motif *</label>
            <Input value={echForm.label} onChange={(e) => setEchForm((f) => ({ ...f, label: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Montant (XAF) *</label>
              <Input type="number" min="1" value={echForm.amount} onChange={(e) => setEchForm((f) => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Échéance</label>
              <Input type="date" value={echForm.due_date} onChange={(e) => setEchForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Notes</label>
            <Input value={echForm.notes} onChange={(e) => setEchForm((f) => ({ ...f, notes: e.target.value }))} />
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
            <Button onClick={handleEncaisser} disabled={busy}>{busy ? 'Traitement…' : "Confirmer l'encaissement"}</Button>
          </div>
        )}
      >
        <p className="mb-3 text-sm text-slate-600">Le reçu sera généré automatiquement après confirmation.</p>
        <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Mode de paiement</label>
        <Select value={encaisseMethod} onChange={(e) => setEncaisseMethod(e.target.value)}>
          {METHODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </Modal>

      <Modal
        title="Lien de paiement parent"
        open={Boolean(linkModal)}
        onClose={() => setLinkModal(null)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setLinkModal(null)}>Fermer</Button>
            <Button onClick={() => copyLink(linkModal?.payment_url)}><Copy size={14} /> Copier le lien</Button>
          </div>
        )}
      >
        <p className="mb-3 text-sm text-slate-600">
          Envoyez ce lien au parent par WhatsApp ou SMS. Il pourra payer avec MTN ou Orange Money sans passer par la caisse.
        </p>
        <Input readOnly value={linkModal?.payment_url || ''} className="font-mono text-xs" />
      </Modal>
    </div>
  );
}

/* ───────────────────────── Onglet Caisse ───────────────────────── */
function CaisseTab({ stats, onFlash, onFail, onChanged }) {
  const [retraits, setRetraits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyRetrait);
  const [busy, setBusy] = useState(false);

  const loadRetraits = useCallback(async () => {
    setLoading(true);
    try { setRetraits(await api.fetchRetraits()); }
    catch { setRetraits([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRetraits(); }, [loadRetraits]);

  async function handleCreate(e) {
    e.preventDefault();
    const value = Number(form.amount);
    if (!form.label.trim() || !value || value <= 0) { onFail('Libellé et montant requis.'); return; }
    setBusy(true);
    try {
      await api.createRetrait({
        label: form.label.trim(),
        amount: value,
        category: form.category,
        notes: form.notes || null,
      });
      setModal(false);
      setForm(emptyRetrait());
      onFlash('Retrait enregistré — solde caisse mis à jour.');
      loadRetraits();
      onChanged();
    } catch (err) {
      onFail(err.message || 'Enregistrement du retrait impossible.');
    } finally { setBusy(false); }
  }

  const rows = useMemo(() => retraits.map((r) => ({
    ...r,
    amount_label: formatXaf(r.amount),
    date_label: r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '—',
  })), [retraits]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Solde caisse" value={formatXaf(stats?.caisse_solde)} trend="Encaissements − retraits" icon={Wallet} tone="slate" />
        <StatCard label="Encaissé ce mois" value={formatXaf(stats?.paid_month_amount)} icon={WalletCards} tone="emerald" />
        <StatCard label="Retraits ce mois" value={formatXaf(stats?.withdrawal_month_amount)} icon={ArrowDownCircle} tone="rose" />
      </div>

      <DataTable
        title="Retraits & dépenses"
        filters={(
          <Button onClick={() => { setForm(emptyRetrait()); setModal(true); }}>
            <Plus size={16} /> Nouveau retrait
          </Button>
        )}
        columns={[
          { key: 'date_label', label: 'Date' },
          { key: 'label', label: 'Libellé' },
          { key: 'category', label: 'Catégorie' },
          { key: 'amount_label', label: 'Montant' },
          { key: 'notes', label: 'Notes' },
        ]}
        rows={loading ? [] : rows}
        emptyMessage={loading ? 'Chargement…' : 'Aucun retrait enregistré.'}
      />

      <Modal
        title="Nouveau retrait / dépense"
        open={modal}
        onClose={() => setModal(false)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </div>
        )}
      >
        <form className="space-y-3" onSubmit={handleCreate}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Libellé *</label>
            <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Montant (XAF) *</label>
              <Input type="number" min="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Catégorie</label>
              <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {RETRAIT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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

/* ───────────────────────── Onglet Suivi ───────────────────────── */
function SuiviTab({ ui, eleves, classesById, schedulesByClasse }) {
  const [comptes, setComptes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classeFilter, setClasseFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const data = await api.fetchPensionComptes();
        if (alive) setComptes(Array.isArray(data) ? data : []);
      } catch { if (alive) setComptes([]); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const comptesByEleve = useMemo(() => {
    const map = {};
    comptes.forEach((c) => { map[c.eleve_id] = c; });
    return map;
  }, [comptes]);

  const rows = useMemo(() => eleves.map((e) => {
    const schedule = e.classe_id ? schedulesByClasse[e.classe_id] : null;
    const totalDue = schedule
      ? Number(schedule.inscription || 0) + Number(schedule.tranche1 || 0)
        + Number(schedule.tranche2 || 0) + Number(schedule.tranche3 || 0)
      : 0;
    const compte = comptesByEleve[e.id];
    const totalPaid = compte ? Number(compte.total_paid || 0) : 0;
    const reste = Math.max(0, totalDue - totalPaid);
    // Montant dû à ce jour = inscription + tranches dont la période a débuté.
    const rank = (m) => (m ? (((Number(m) - 9) % 12) + 12) % 12 : -1);
    const nowRank = rank(new Date().getMonth() + 1);
    let expectedNow = 0;
    if (schedule) {
      expectedNow = Number(schedule.inscription || 0);
      [['tranche1', 't1_start_month'], ['tranche2', 't2_start_month'], ['tranche3', 't3_start_month']]
        .forEach(([amt, startKey]) => {
          const start = schedule[startKey];
          if (!start || nowRank >= rank(start)) expectedNow += Number(schedule[amt] || 0);
        });
    }
    let statut = 'unknown';
    if (totalDue === 0) statut = 'unknown';
    else if (reste <= 0 || totalPaid >= expectedNow) statut = 'ok';
    else statut = 'late';
    return {
      id: e.id,
      student: [e.nom, e.prenom].filter(Boolean).join(' ') || `ID ${e.id}`,
      matricule: e.matricule || '—',
      classe: e.classe_id ? (classesById[e.classe_id] || `#${e.classe_id}`) : '—',
      classe_id: e.classe_id,
      due_label: totalDue ? formatXaf(totalDue) : '—',
      paid_label: formatXaf(totalPaid),
      reste_label: totalDue ? formatXaf(reste) : '—',
      statut,
    };
  }), [eleves, schedulesByClasse, comptesByEleve, classesById]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (classeFilter && String(r.classe_id) !== String(classeFilter)) return false;
    if (statutFilter && r.statut !== statutFilter) return false;
    return true;
  }), [rows, classeFilter, statutFilter]);

  const counts = useMemo(() => ({
    ok: rows.filter((r) => r.statut === 'ok').length,
    late: rows.filter((r) => r.statut === 'late').length,
  }), [rows]);

  const classeOptions = useMemo(() => {
    const ids = [...new Set(eleves.map((e) => e.classe_id).filter(Boolean))];
    return ids.map((id) => [id, classesById[id] || `#${id}`]);
  }, [eleves, classesById]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Élèves en règle" value={loading ? '…' : counts.ok} icon={ListChecks} tone="emerald" />
        <StatCard label="Élèves pas en règle" value={loading ? '…' : counts.late} icon={ListChecks} tone="rose" />
      </div>

      <DataTable
        title="Suivi des paiements par élève"
        filters={(
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Classe</label>
              <Select value={classeFilter} onChange={(e) => setClasseFilter(e.target.value)}>
                <option value="">Toutes</option>
                {classeOptions.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
              </Select>
            </div>
            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Statut</label>
              <Select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}>
                <option value="">Tous</option>
                <option value="ok">En règle</option>
                <option value="late">Pas en règle</option>
                <option value="unknown">Frais non configurés</option>
              </Select>
            </div>
          </div>
        )}
        columns={[
          { key: 'student', label: ui.student },
          { key: 'matricule', label: 'Matricule' },
          { key: 'classe', label: 'Classe' },
          { key: 'due_label', label: 'Total dû' },
          { key: 'paid_label', label: 'Versé' },
          { key: 'reste_label', label: 'Reste' },
          {
            key: 'statut',
            label: 'Situation',
            render: (row) => (
              row.statut === 'ok' ? <Badge tone="emerald">En règle</Badge>
                : row.statut === 'late' ? <Badge tone="rose">Pas en règle</Badge>
                : <Badge tone="slate">Non configuré</Badge>
            ),
          },
        ]}
        rows={loading ? [] : filtered}
        emptyMessage={loading ? 'Chargement…' : 'Aucun élève.'}
      />
    </div>
  );
}
