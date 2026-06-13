import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import * as api from '../../api/api';
import { Button, Card, Input, PageHeader } from '../../components/ui';

const EMPTY = {
  name: '', city: '', address: '', phone: '', logo_url: '',
  bulletin_motto: '', bulletin_po_box: '',
  bulletin_delegation_regional: '', bulletin_delegation_departementale: '',
  bulletin_next_term_note: '',
};

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function SettingsPage() {
  const [school, setSchool] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await api.fetchMySchool();
        if (!active) return;
        setSchool(s);
        setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, s[k] ?? ''])) });
      } catch (err) {
        if (active) setError(err.message || "Impossible de charger l'etablissement.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (!school) return;
    setSaving(true); setNotice(''); setError('');
    try {
      const updated = await api.updateSchool(school.id, form);
      setSchool(updated);
      setNotice('Parametres enregistres. Le bulletin utilisera ces informations.');
    } catch (err) {
      setError(err.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <><PageHeader title="Parametres" /><p className="text-sm text-slate-500">Chargement...</p></>;
  if (!school) return <><PageHeader title="Parametres" /><div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error || 'Etablissement introuvable.'}</div></>;

  return (
    <>
      <PageHeader title="Parametres" description="Profil de l'etablissement et en-tete officiel du bulletin." breadcrumb="Etablissement / Parametres" />

      {notice && <div className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}
      {error && <div className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Etablissement</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nom de l'etablissement"><Input required value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Ville"><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="Telephone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+237 6XX XXX XXX" /></Field>
            <Field label="Adresse"><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-lg font-bold text-slate-900">En-tete du bulletin</h2>
          <p className="mb-4 text-sm text-slate-500">Ces informations apparaissent en haut de chaque bulletin officiel (en-tete bilingue MINESEC).</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Devise de l'etablissement" hint="Ex : a chosen generation"><Input value={form.bulletin_motto} onChange={(e) => set('bulletin_motto', e.target.value)} /></Field>
            <Field label="Boite postale" hint="Ex : BP 20142 Yaounde - 6XX XXX XXX"><Input value={form.bulletin_po_box} onChange={(e) => set('bulletin_po_box', e.target.value)} /></Field>
            <Field label="Delegation regionale" hint="Ex : REGIONAL DELEGATION FOR CENTER"><Input value={form.bulletin_delegation_regional} onChange={(e) => set('bulletin_delegation_regional', e.target.value)} /></Field>
            <Field label="Delegation departementale" hint="Ex : DIVISIONAL DELEGATION FOR MEFOU AND AFAMBA"><Input value={form.bulletin_delegation_departementale} onChange={(e) => set('bulletin_delegation_departementale', e.target.value)} /></Field>
            <Field label="Note de rentree" hint="Ex : Next term re-opens: April 20th, 2026"><Input value={form.bulletin_next_term_note} onChange={(e) => set('bulletin_next_term_note', e.target.value)} /></Field>
            <Field label="Logo (URL)" hint="Lien vers l'image du logo (optionnel)"><Input value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://..." /></Field>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button disabled={saving}><Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
        </div>
      </form>
    </>
  );
}
