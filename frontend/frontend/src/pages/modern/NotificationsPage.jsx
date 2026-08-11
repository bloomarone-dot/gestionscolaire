import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, DataTable, EmptyState, PageHeader } from '../../components/ui';

// §12 — Historique des notifications envoyées (preuve d'envoi).
const CHANNEL_TONE = { SMS: 'blue', WHATSAPP: 'emerald', EMAIL: 'amber', INTERNAL: 'slate' };
const STATUS_TONE = { SENT: 'emerald', FAILED: 'rose', PENDING: 'amber' };

function formatDate(value) {
  if (!value) return '-';
  try { return new Date(value).toLocaleString('fr-FR'); } catch { return value; }
}

export default function NotificationsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.fetchNotifications()
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Historique indisponible.'))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'created_at', label: 'Date', render: (r) => formatDate(r.created_at) },
    { key: 'event', label: 'Événement' },
    { key: 'recipient', label: 'Destinataire', render: (r) => r.recipient || '—' },
    { key: 'channel', label: 'Canal', render: (r) => <Badge tone={CHANNEL_TONE[r.channel] || 'slate'}>{r.channel}</Badge> },
    { key: 'content', label: 'Message' },
    { key: 'status', label: 'Statut', render: (r) => <Badge tone={STATUS_TONE[r.status] || 'slate'}>{r.status}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title="Notifications"
        breadcrumb="Communication"
        description="Historique de toutes les notifications envoyées (SMS, WhatsApp, Email, interne) — conservé comme preuve d'envoi."
      />
      {error && <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
      {loading ? (
        <EmptyState icon={Bell} title="Chargement…" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Bell} title="Aucune notification" description="Aucune notification n'a encore été envoyée." />
      ) : (
        <DataTable title={`${rows.length} notification(s)`} columns={columns} rows={rows} />
      )}
    </div>
  );
}
