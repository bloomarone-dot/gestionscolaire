import { useEffect, useState } from 'react';
import { Megaphone, Send } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, Card, DataTable, EmptyState, PageHeader, Textarea } from '../../components/ui';

// §8 / §12.1 — Annonce générale : texte libre diffusé au personnel et/ou aux parents.
const CHANNEL_OPTS = [['SMS', 'SMS'], ['WHATSAPP', 'WhatsApp'], ['EMAIL', 'Email'], ['INTERNAL', 'Notification interne']];
const AUDIENCE_OPTS = [['personnel', 'Personnel'], ['parents', 'Parents / Tuteurs']];

function Chip({ on, label, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold ring-1 transition ${on ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>
      {label}
    </button>
  );
}

function formatDate(value) {
  if (!value) return '-';
  try { return new Date(value).toLocaleString('fr-FR'); } catch { return value; }
}

export default function AnnouncementsPage() {
  const [content, setContent] = useState('');
  const [channels, setChannels] = useState(['INTERNAL']);
  const [audience, setAudience] = useState([]);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);
  const [history, setHistory] = useState([]);

  const toggle = (list, set, code) => set(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);

  function loadHistory() {
    api.fetchNotifications()
      .then((data) => setHistory((Array.isArray(data) ? data : []).filter((n) => n.event === 'Announcement')))
      .catch(() => setHistory([]));
  }
  useEffect(loadHistory, []);

  // Résout l'audience choisie en numéros/contacts.
  async function resolveRecipients() {
    const recipients = new Set();
    if (audience.includes('personnel')) {
      const staff = await api.fetchPersonnel().catch(() => []);
      staff.forEach((p) => { if (p.phone) recipients.add(p.phone); });
    }
    if (audience.includes('parents')) {
      const eleves = await api.fetchEleves_admin().catch(() => []);
      eleves.forEach((e) => { const ph = e.contact_parent; if (ph && ph !== '-') recipients.add(ph); });
    }
    return [...recipients];
  }

  async function submit(event) {
    event.preventDefault();
    if (!content.trim()) { setNotice({ message: 'Saisissez le contenu de l’annonce.', tone: 'rose' }); return; }
    if (!channels.length) { setNotice({ message: 'Choisissez au moins un canal.', tone: 'rose' }); return; }
    setSending(true); setNotice(null);
    try {
      const recipients = await resolveRecipients();
      const res = await api.sendAnnouncement({ content: content.trim(), recipients, channels });
      setNotice({ message: `Annonce envoyée (${Array.isArray(res) ? res.length : 0} message(s)).`, tone: 'emerald' });
      setContent('');
      loadHistory();
    } catch (err) {
      setNotice({ message: err.message || "Échec de l'envoi de l'annonce.", tone: 'rose' });
    } finally {
      setSending(false);
    }
  }

  const columns = [
    { key: 'created_at', label: 'Date', render: (r) => formatDate(r.created_at) },
    { key: 'recipient', label: 'Destinataire', render: (r) => r.recipient || 'Diffusion' },
    { key: 'channel', label: 'Canal', render: (r) => <Badge tone="slate">{r.channel}</Badge> },
    { key: 'content', label: 'Message' },
    { key: 'status', label: 'Statut', render: (r) => <Badge tone={r.status === 'SENT' ? 'emerald' : 'amber'}>{r.status}</Badge> },
  ];

  return (
    <div>
      <PageHeader title="Annonces" breadcrumb="Communication" description="Diffusez un message au personnel et/ou aux parents (SMS, WhatsApp, Email, notification interne)." />
      {notice && <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${notice.tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{notice.message}</div>}

      <Card className="mb-6 p-5">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <span className="mb-1 block text-sm font-semibold text-slate-700">Message</span>
            <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Texte de l'annonce…" />
          </div>
          <div>
            <span className="mb-1 block text-sm font-semibold text-slate-700">Destinataires</span>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_OPTS.map(([code, label]) => <Chip key={code} on={audience.includes(code)} label={label} onClick={() => toggle(audience, setAudience, code)} />)}
            </div>
            <p className="mt-1 text-xs text-slate-400">Sans destinataire, l'annonce est diffusée en interne uniquement.</p>
          </div>
          <div>
            <span className="mb-1 block text-sm font-semibold text-slate-700">Canaux</span>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_OPTS.map(([code, label]) => <Chip key={code} on={channels.includes(code)} label={label} onClick={() => toggle(channels, setChannels, code)} />)}
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled={sending}><Send size={16} /> {sending ? 'Envoi…' : "Envoyer l'annonce"}</Button>
          </div>
        </form>
      </Card>

      {history.length === 0 ? (
        <EmptyState icon={Megaphone} title="Aucune annonce envoyée" />
      ) : (
        <DataTable title="Annonces envoyées" columns={columns} rows={history} />
      )}
    </div>
  );
}
