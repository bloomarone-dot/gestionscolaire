/** Parse une date API (YYYY-MM-DD ou ISO) en Date locale minuit — évite le décalage UTC. */
export function parseLocalDate(value) {
  if (!value) return null;
  const raw = String(value).trim().split(/[T ]/)[0];
  const [year, month, day] = raw.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function toDateInputValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatLocalDate(value, locale = 'fr-FR') {
  const parsed = parseLocalDate(value);
  return parsed ? parsed.toLocaleDateString(locale) : '';
}

export function getPeriodeStatus(periode) {
  const today = parseLocalDate(toDateInputValue(new Date()));
  const debut = parseLocalDate(periode.date_debut);
  const fin = parseLocalDate(periode.date_fin);
  if (!today || !debut || !fin) {
    return { label: 'Inconnue', className: 'badge-orange' };
  }
  if (today < debut) return { label: 'À venir', className: 'badge-orange' };
  if (today > fin) return { label: 'Expirée', className: 'badge-red' };
  return { label: 'Ouverte', className: 'badge-green' };
}

export function formatSessionCountdown(dateFinValue) {
  const fin = parseLocalDate(dateFinValue);
  if (!fin) return null;
  fin.setHours(23, 59, 59, 999);
  const now = new Date();
  const diff = fin.getTime() - now.getTime();
  if (diff <= 0) return 'Session expirée';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `Il reste ${days} jour${days > 1 ? 's' : ''} et ${hours}h`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `Il reste ${hours}h ${mins}min`;
}
