import { Input, Select } from './ui';

export const HEALTH_STATUTS = [
  'Bon',
  'À surveiller',
  'Suivi médical',
  'Handicap ou besoins spécifiques',
  'Non renseigné',
];

export const HEALTH_APTITUDES = [
  'Apte à toutes les activités',
  'Apte avec restrictions',
  'Inapte temporaire',
  'Inapte total',
  'Non renseigné',
];

export const EMPTY_HEALTH = {
  statut: 'Non renseigné',
  allergies: '',
  pathologies: '',
  traitement: 'Non',
  traitement_details: '',
  aptitude: 'Non renseigné',
  urgence_nom: '',
  urgence_lien: '',
  urgence_phone: '',
};

// Convertit la valeur stockée (JSON ou ancien texte libre) en objet structuré.
export function parseHealth(value) {
  if (!value) return { ...EMPTY_HEALTH };
  if (typeof value === 'object') return { ...EMPTY_HEALTH, ...value };
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') return { ...EMPTY_HEALTH, ...parsed };
  } catch {
    // Ancien format texte libre : on le conserve dans « pathologies ».
    return { ...EMPTY_HEALTH, pathologies: String(value) };
  }
  return { ...EMPTY_HEALTH };
}

export function healthIsEmpty(obj) {
  const o = obj || {};
  return (
    (!o.statut || o.statut === 'Non renseigné')
    && !o.allergies && !o.pathologies
    && (!o.traitement || o.traitement === 'Non') && !o.traitement_details
    && (!o.aptitude || o.aptitude === 'Non renseigné')
    && !o.urgence_nom && !o.urgence_lien && !o.urgence_phone
  );
}

// Renvoie une chaîne JSON prête à stocker, ou null si tout est vide.
export function serializeHealth(obj) {
  if (healthIsEmpty(obj)) return null;
  return JSON.stringify(obj);
}

export default function HealthFields({ value, onChange, className = '' }) {
  const v = value || EMPTY_HEALTH;
  const set = (patch) => onChange({ ...v, ...patch });

  return (
    <div className={`grid gap-3 md:grid-cols-2 ${className}`}>
      <label className="md:col-span-2 block">
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Statut de santé</span>
        <Select value={v.statut} onChange={(e) => set({ statut: e.target.value })}>
          {HEALTH_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Allergies</span>
        <Input value={v.allergies} onChange={(e) => set({ allergies: e.target.value })} placeholder="Ex. arachides, pénicilline…" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Pathologies connues</span>
        <Input value={v.pathologies} onChange={(e) => set({ pathologies: e.target.value })} placeholder="Ex. asthme, drépanocytose…" />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Traitement médical</span>
        <Select value={v.traitement} onChange={(e) => set({ traitement: e.target.value })}>
          <option value="Non">Non</option>
          <option value="Oui">Oui</option>
        </Select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Détails du traitement</span>
        <Input
          value={v.traitement_details}
          onChange={(e) => set({ traitement_details: e.target.value })}
          disabled={v.traitement !== 'Oui'}
          placeholder={v.traitement === 'Oui' ? 'Médicament, posologie…' : '—'}
        />
      </label>

      <label className="md:col-span-2 block">
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Aptitude aux activités physiques</span>
        <Select value={v.aptitude} onChange={(e) => set({ aptitude: e.target.value })}>
          {HEALTH_APTITUDES.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
      </label>

      <div className="md:col-span-2">
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Personne à contacter en cas d'urgence</span>
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={v.urgence_nom} onChange={(e) => set({ urgence_nom: e.target.value })} placeholder="Nom" />
          <Input value={v.urgence_lien} onChange={(e) => set({ urgence_lien: e.target.value })} placeholder="Lien de parenté" />
          <Input value={v.urgence_phone} onChange={(e) => set({ urgence_phone: e.target.value })} placeholder="Téléphone" />
        </div>
      </div>
    </div>
  );
}
