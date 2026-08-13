import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownCircle, Copy, Download, Link2, ListChecks, Plus, UserPlus, Wallet, WalletCards,
} from 'lucide-react';
import * as api from '../../api/api';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import {
  Badge, Button, DataTable, Input, Modal, PageHeader, Select, StatCard,
} from '../../components/ui';
import { buildPensionSuiviRow, FEE_STATUS_META, matchesSuiviFilter } from '../../utils/pensionSuivi';

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
  const navigate = useNavigate();

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
    <div className="space-y-6">
      {/* En-tête : titre + description + action rapide "Inscription" */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Paiements & caisse"
          description="Encaissements de scolarité (inscription + 3 tranches), suivi des élèves et contrôle de la caisse."
        />
        <Button
          type="button"
          onClick={() => navigate('/app/students/nouveau')}
          className="shrink-0 shadow-sm"
        >
          <UserPlus size={16} /> Inscription
        </Button>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Indicateurs globaux — visibles quel que soit l'onglet, donc jamais dupliqués plus bas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Encaissé ce mois" value={loading ? '…' : (stats?.paid_month_count ?? 0)} trend={formatXaf(stats?.paid_month_amount)} icon={WalletCards} tone="emerald" />
        <StatCard label="En ligne (Mobile Money)" value={loading ? '…' : (stats?.online_month_count ?? 0)} trend={formatXaf(stats?.online_month_amount)} icon={WalletCards} tone="blue" />
        <StatCard label="Retraits ce mois" value={loading ? '…' : (stats?.withdrawal_month_count ?? 0)} trend={formatXaf(stats?.withdrawal_month_amount)} icon={ArrowDownCircle} tone="rose" />
        <StatCard label="Solde caisse" value={loading ? '…' : formatXaf(stats?.caisse_solde)} trend="Encaissements − retraits" icon={Wallet} tone="slate" />
      </div>

      {/* Onglets — style "segmented control" plus moderne que le soulignement */}
      <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setTab(key); setNotice(''); setError(''); }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-white text-[#101F3C] shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-700'
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
            {/* Desktop / tablette : tableau */}
            <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
              <table className="w-full text-sm">
                <thead className="bg-[#101F3C]/[0.03] text-left text-xs uppercase text-slate-500">
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
                <tfoot className="bg-[#101F3C]/[0.03]">
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

            {/* Mobile : cartes empilées par poste + total mis en avant */}
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 md:hidden">
              {resume.buckets.map((b) => (
                <div key={b.fee_type} className="p-3">
                  <p className="font-semibold text-slate-800">{b.label}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <dt className="uppercase tracking-wide text-slate-400">Dû</dt>
                      <dd className="mt-0.5 text-sm text-slate-700">{formatXaf(b.due)}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide text-slate-400">Versé</dt>
                      <dd className="mt-0.5 text-sm text-emerald-700">{formatXaf(b.paid)}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide text-slate-400">Reste</dt>
                      <dd className={`mt-0.5 text-sm font-semibold ${Number(b.reste) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {formatXaf(b.reste)}
                      </dd>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-[#101F3C]/[0.04] p-3">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Total</span>
                  <span>{formatXaf(resume.total_due)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-emerald-700">Versé {formatXaf(resume.total_paid)}</span>
                  <span className={Number(resume.reste) > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    Reste {formatXaf(resume.reste)}
                  </span>
                </div>
              </div>
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

            <form onSubmit={handlePay} className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-3">
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
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs text-slate-500">
                  Dernier reçu : <b>{lastReceipt.receipt_number}</b> — affectation automatique inscription → tranches.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 py-1.5 text-xs"
                  onClick={() => api.downloadPensionRecu(lastReceipt.receipt_number, establishmentName).catch((err) => onFail(err.message))}
                >
                  <Download size={14} /> Télécharger le reçu
                </Button>
              </div>
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

/* ───────────────────────── Onglet Caisse ─────────────────────────
   Les 3 cartes (Encaissé ce mois / Retraits ce mois / Solde caisse) sont déjà
   affichées en permanence tout en haut de la page — on ne les répète plus ici.
   On garde seulement un bandeau "Solde caisse" mis en avant, propre à cet onglet. */
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#101F3C] to-[#1c3766] px-5 py-4 text-white shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Solde actuel de la caisse</p>
          <p className="mt-1 text-3xl font-bold">{formatXaf(stats?.caisse_solde)}</p>
          <p className="mt-0.5 text-xs text-white/60">Encaissements − retraits</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <Wallet size={22} className="text-white" />
        </div>
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
function FeeBucketBadges({ buckets }) {
  return (
    <div className="flex flex-col gap-1">
      {buckets.filter((b) => b.status !== 'none').map((b) => {
        const meta = FEE_STATUS_META[b.status];
        return (
          <div key={b.key} className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{b.label}</span>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
        );
      })}
      {buckets.every((b) => b.status === 'none') && <span className="text-sm text-slate-400">—</span>}
    </div>
  );
}

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

  const rows = useMemo(() => eleves.map((e) => buildPensionSuiviRow(
    e,
    e.classe_id ? schedulesByClasse[e.classe_id] : null,
    comptesByEleve[e.id],
    classesById,
  )), [eleves, schedulesByClasse, comptesByEleve, classesById]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (classeFilter && String(r.classe_id) !== String(classeFilter)) return false;
    return matchesSuiviFilter(r, statutFilter);
  }), [rows, classeFilter, statutFilter]);

  const counts = useMemo(() => ({
    ok: rows.filter((r) => r.statut === 'ok').length,
    late: rows.filter((r) => r.statut === 'late').length,
    solde: rows.filter((r) => r.progress === 'solde').length,
    partial: rows.filter((r) => r.progress === 'partial' || r.progress === 'inscription').length,
  }), [rows]);

  const classeOptions = useMemo(() => {
    const ids = [...new Set(eleves.map((e) => e.classe_id).filter(Boolean))];
    return ids.map((id) => [id, classesById[id] || `#${id}`]);
  }, [eleves, classesById]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Élèves en règle" value={loading ? '…' : counts.ok} icon={ListChecks} tone="emerald" />
        <StatCard label="Élèves pas en règle" value={loading ? '…' : counts.late} icon={ListChecks} tone="rose" />
        <StatCard label="Soldés (totalité)" value={loading ? '…' : counts.solde} icon={ListChecks} tone="blue" />
        <StatCard label="Inscription / partiel" value={loading ? '…' : counts.partial} icon={ListChecks} tone="amber" />
      </div>

      <DataTable
        title="Suivi des paiements par élève"
        description="Inscription, 1re / 2e / 3e tranche : payée, partielle ou impayée."
        filters={(
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Classe</label>
              <Select value={classeFilter} onChange={(e) => setClasseFilter(e.target.value)}>
                <option value="">Toutes</option>
                {classeOptions.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
              </Select>
            </div>
            <div className="min-w-[220px]">
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Situation</label>
              <Select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}>
                <option value="">Tous</option>
                <option value="solde">Soldé (totalité)</option>
                <option value="inscription">Inscription seulement</option>
                <option value="tranche1">Jusqu'à la 1re tranche</option>
                <option value="partial">Paiement partiel</option>
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
          {
            key: 'buckets',
            label: 'Inscription & tranches',
            render: (row) => <FeeBucketBadges buckets={row.buckets} />,
          },
          {
            key: 'detail',
            label: 'Détail',
            render: (row) => <span className="max-w-xs text-xs leading-5 text-slate-600">{row.detail}</span>,
          },
          { key: 'paid_label', label: 'Versé' },
          { key: 'reste_label', label: 'Reste' },
          {
            key: 'statut',
            label: 'Situation',
            render: (row) => (
              row.progress === 'solde' ? <Badge tone="emerald">Soldé</Badge>
                : row.statut === 'ok' ? <Badge tone="blue">En règle</Badge>
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