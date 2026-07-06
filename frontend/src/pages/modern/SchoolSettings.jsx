import { useEffect, useState } from 'react';
import { Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import * as api from '../../api/api';
import { useAuth } from '../../context/useAuth';
import { Button, Card, Input, PageHeader } from '../../components/ui';
import BulletinThemeEditor from '../../components/BulletinThemeEditor';
import { DEFAULT_BULLETIN_THEME, normalizeBulletinTheme } from '../../utils/bulletinTheme';
import { compressImageFile } from '../../utils/imageCompress';

const DEFAULT_APPRECIATION_SCALES = {
  fr: [
    { min: 18, label: 'EXCELLENT' },
    { min: 16, label: 'TB' },
    { min: 14, label: 'B' },
    { min: 12, label: 'AB' },
    { min: 10, label: 'PASSABLE' },
    { min: 0, label: 'INSUFFISANT' },
  ],
  en: [
    { min: 18, label: 'EXCELLENT' },
    { min: 16, label: 'A' },
    { min: 10, label: 'IPA' },
    { min: 0, label: 'CNA' },
  ],
};

const EMPTY = {
  name: '', city: '', address: '', phone: '', logo_url: '',
  bulletin_motto: '', bulletin_po_box: '',
  bulletin_delegation_regional: '', bulletin_delegation_departementale: '',
  bulletin_next_term_note: '',
};

const SUBSYSTEM_OPTS = [['FRANCOPHONE', 'Francophone'], ['ANGLOPHONE', 'Anglophone']];
const TYPE_OPTS = [['GENERAL', 'Général'], ['TECHNIQUE', 'Technique']];
const CHANNEL_OPTS = [['SMS', 'SMS'], ['WHATSAPP', 'WhatsApp'], ['EMAIL', 'Email'], ['INTERNAL', 'Notification interne']];

function CheckGroup({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([code, label]) => {
        const on = selected.includes(code);
        return (
          <button
            type="button"
            key={code}
            onClick={() => onToggle(code)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ring-1 transition ${
              on ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function AppreciationScaleEditor({ title, bands, onChange }) {
  const updateBand = (index, field, value) => {
    onChange(bands.map((band, i) => (i === index ? { ...band, [field]: value } : band)));
  };

  const addBand = () => onChange([...bands, { min: 10, label: '' }]);

  const removeBand = (index) => onChange(bands.filter((_, i) => i !== index));

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <Button type="button" variant="secondary" className="px-2 py-1 text-xs" onClick={addBand}>
          <Plus size={14} /> Ajouter
        </Button>
      </div>
      <div className="space-y-2">
        {bands.map((band, index) => (
          <div key={`${title}-${index}`} className="grid grid-cols-[1fr_2fr_auto] gap-2">
            <Input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={band.min}
              onChange={(e) => updateBand(index, 'min', Number(e.target.value))}
              placeholder="Seuil min"
            />
            <Input
              value={band.label}
              onChange={(e) => updateBand(index, 'label', e.target.value)}
              placeholder="Libelle (ex. EXCELLENT)"
            />
            <Button type="button" variant="ghost" className="px-2" onClick={() => removeBand(index)} aria-label="Supprimer">
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">Seuil minimum sur 20 ; la note utilise le libelle du seuil le plus eleve atteint.</p>
    </div>
  );
}

export function SettingsPage() {
  const { user, selectedSchool } = useAuth();
  const [school, setSchool] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [appreciationScales, setAppreciationScales] = useState(DEFAULT_APPRECIATION_SCALES);
  const [bulletinTheme, setBulletinTheme] = useState({ ...DEFAULT_BULLETIN_THEME });
  const [themeFrancophone, setThemeFrancophone] = useState({ ...DEFAULT_BULLETIN_THEME });
  const [themeAnglophone, setThemeAnglophone] = useState({ ...DEFAULT_BULLETIN_THEME });
  const [themeSection, setThemeSection] = useState('francophone');
  const [layoutProfile, setLayoutProfile] = useState(null);
  const [bulletinReferenceUrl, setBulletinReferenceUrl] = useState('');
  const [layoutSummary, setLayoutSummary] = useState('');
  const [analyzingTemplate, setAnalyzingTemplate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({ subsystems: [], teaching_types: [], channels: ['INTERNAL'] });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let s;
        if (user?.role === 'superadmin' && selectedSchool?.id) {
          s = await api.getSchool(selectedSchool.id);
        } else {
          s = await api.fetchMySchool();
        }
        if (!active) return;
        setSchool(s);
        setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, s[k] ?? ''])) });
        setAppreciationScales(
          s.bulletin_appreciation_scales?.fr?.length
            ? s.bulletin_appreciation_scales
            : DEFAULT_APPRECIATION_SCALES,
        );
        const baseTheme = normalizeBulletinTheme(s.bulletin_theme);
        setBulletinTheme(baseTheme);
        setThemeFrancophone(normalizeBulletinTheme(s.bulletin_theme?.francophone || baseTheme));
        setThemeAnglophone(normalizeBulletinTheme(s.bulletin_theme?.anglophone || baseTheme));
        setLayoutProfile(s.bulletin_layout_profile || null);
        setBulletinReferenceUrl(s.bulletin_reference_url || '');
        setLayoutSummary(s.bulletin_layout_profile?.source_filename
          ? `Modèle enregistré : ${s.bulletin_layout_profile.source_filename}`
          : '');
        setProfile({
          subsystems: s.subsystems || [],
          teaching_types: s.teaching_types || [],
          channels: s.channels?.length ? s.channels : ['INTERNAL'],
        });
      } catch (err) {
        if (active) setError(err.message || "Impossible de charger l'etablissement.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user?.role, selectedSchool?.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleTemplateUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAnalyzingTemplate(true);
    setError('');
    setNotice('');
    try {
      const result = await api.analyzeBulletinTemplate(file);
      const profile = result.layout_profile || {};
      setLayoutProfile(profile);
      setLayoutSummary(result.summary || 'Modèle analysé.');
      if (result.theme_suggestions && Object.keys(result.theme_suggestions).length) {
        setThemeFrancophone((current) => ({ ...current, ...result.theme_suggestions }));
        setThemeAnglophone((current) => ({ ...current, ...result.theme_suggestions }));
        setNotice('Couleurs détectées appliquées au thème — enregistrez pour confirmer.');
      }
      if (file.type.startsWith('image/')) {
        const dataUrl = await compressImageFile(file);
        setBulletinReferenceUrl(dataUrl);
      }
    } catch (err) {
      setError(err.message || 'Analyse du modèle impossible.');
    } finally {
      setAnalyzingTemplate(false);
      event.target.value = '';
    }
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const dataUrl = await compressImageFile(file);
      set('logo_url', dataUrl);
      setNotice('Logo charge — enregistrez pour l appliquer aux bulletins.');
    } catch (err) {
      setError(err.message || 'Impossible de traiter le logo.');
    }
  }

  const toggleProfile = (key, code) => setProfile((p) => ({
    ...p, [key]: p[key].includes(code) ? p[key].filter((c) => c !== code) : [...p[key], code],
  }));

  async function handleProfileSubmit(event) {
    event.preventDefault();
    if (!school) return;
    setSavingProfile(true); setNotice(''); setError('');
    try {
      const updated = await api.updateSchoolProfile(school.id, profile);
      setSchool(updated);
      setNotice('Profil pédagogique enregistré. La cascade ne proposera que les options activées.');
    } catch (err) {
      setError(err.message || 'Enregistrement du profil impossible.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!school) return;
    setSaving(true); setNotice(''); setError('');
    try {
      const updated = await api.updateSchool(school.id, {
        ...form,
        bulletin_appreciation_scales: appreciationScales,
        bulletin_layout_profile: layoutProfile,
        bulletin_reference_url: bulletinReferenceUrl || null,
        bulletin_theme: {
          preset: themeFrancophone.preset || themeAnglophone.preset || bulletinTheme.preset,
          francophone: themeFrancophone,
          anglophone: themeAnglophone,
        },
      });
      setSchool(updated);
      setAppreciationScales(updated.bulletin_appreciation_scales || appreciationScales);
      setBulletinTheme(normalizeBulletinTheme(updated.bulletin_theme));
      setThemeFrancophone(normalizeBulletinTheme(updated.bulletin_theme?.francophone || updated.bulletin_theme));
      setThemeAnglophone(normalizeBulletinTheme(updated.bulletin_theme?.anglophone || updated.bulletin_theme));
      setNotice('Parametres enregistres. Le bulletin utilisera ces informations.');
    } catch (err) {
      setError(err.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <><PageHeader title="Paramètres établissement" /><p className="text-sm text-slate-500">Chargement...</p></>;
  if (!school) return (
    <>
      <PageHeader title="Paramètres établissement" />
      <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
        {error || (user?.role === 'superadmin'
          ? 'Sélectionnez un établissement en haut de page pour configurer le bulletin.'
          : 'Établissement introuvable.')}
      </div>
    </>
  );

  return (
    <>
      <PageHeader
        title="Paramètres établissement"
        description="Profil, logo, couleurs du bulletin par section, barème des appréciations — chaque établissement a son modèle."
        breadcrumb="Établissement / Paramètres"
      />

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
            <Field label="Logo du bulletin" hint="Image affichee au centre de l en-tete (PNG/JPG)">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Upload size={16} /> Telecharger le logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                {form.logo_url && (
                  <img src={form.logo_url} alt="Apercu logo" className="h-20 w-auto rounded border border-slate-200 bg-white p-1" />
                )}
              </div>
            </Field>
            <Field label="Logo (URL alternative)" hint="Ou coller un lien https://..."><Input value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://..." /></Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Modèle de bulletin (import)</h2>
          <p className="mb-4 text-sm text-slate-500">
            Téléversez un bulletin PDF ou une image de référence de votre établissement.
            Le système détecte automatiquement la présentation (en-tête bilingue ou francophone,
            groupes de matières, couleurs…) et adapte les bulletins générés.
          </p>
          <div className="flex flex-wrap items-start gap-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Upload size={16} />
              {analyzingTemplate ? 'Analyse en cours…' : 'Importer un bulletin modèle'}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                disabled={analyzingTemplate}
                onChange={handleTemplateUpload}
              />
            </label>
            {bulletinReferenceUrl && (
              <img
                src={bulletinReferenceUrl}
                alt="Bulletin modèle"
                className="h-28 w-auto rounded border border-slate-200 bg-white p-1"
              />
            )}
          </div>
          {layoutSummary && (
            <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">{layoutSummary}</p>
          )}
          {layoutProfile && (
            <ul className="mt-2 list-inside list-disc text-xs text-slate-500">
              <li>En-tête : {layoutProfile.header_style || '—'}</li>
              <li>Groupes matières : {layoutProfile.show_subject_groups ? 'oui' : 'non'}</li>
              <li>Série : {layoutProfile.show_series ? 'oui' : 'non'}</li>
              <li>Confiance : {Math.round((layoutProfile.confidence || 0) * 100)} %</li>
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Apparence du bulletin par section</h2>
          <p className="mb-4 text-sm text-slate-500">
            Couleurs distinctes pour la section francophone et anglophone. Le bulletin d&apos;une classe
            Form utilise le modèle anglophone ; une classe 6ème, 2nde, etc. utilise le modèle francophone.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              ['francophone', 'Francophone (BULLETIN, PREMIER GROUPE…)'],
              ['anglophone', 'Anglophone (REPORT CARD, FIRST GROUP…)'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setThemeSection(key)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ring-1 transition ${
                  themeSection === key
                    ? 'bg-blue-50 text-blue-700 ring-blue-200'
                    : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <BulletinThemeEditor
            theme={themeSection === 'anglophone' ? themeAnglophone : themeFrancophone}
            onChange={themeSection === 'anglophone' ? setThemeAnglophone : setThemeFrancophone}
          />
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Barème des appréciations</h2>
              <p className="mt-1 text-sm text-slate-500">
                Colonne « Appr. » du bulletin (MVP §14). Personnalisez les seuils par sous-système.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAppreciationScales(DEFAULT_APPRECIATION_SCALES)}
            >
              <RotateCcw size={16} /> Restaurer les valeurs par defaut
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <AppreciationScaleEditor
              title="Francophone"
              bands={appreciationScales.fr || []}
              onChange={(fr) => setAppreciationScales((current) => ({ ...current, fr }))}
            />
            <AppreciationScaleEditor
              title="Anglophone"
              bands={appreciationScales.en || []}
              onChange={(en) => setAppreciationScales((current) => ({ ...current, en }))}
            />
          </div>
        </Card>

        <div className="flex gap-2">
          <Button disabled={saving}><Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
        </div>
      </form>

      <form onSubmit={handleProfileSubmit} className="mt-6">
        <Card className="p-5">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Profil pédagogique & communication</h2>
          <p className="mb-4 text-sm text-slate-500">
            Sous-systèmes et types d'enseignement activés (§14) : la cascade de création ne proposera
            que ces options. Laissez vide pour tout autoriser. Canaux de notification activés (§12.2).
          </p>
          <div className="space-y-4">
            <Field label="Sous-systèmes actifs"><CheckGroup options={SUBSYSTEM_OPTS} selected={profile.subsystems} onToggle={(c) => toggleProfile('subsystems', c)} /></Field>
            <Field label="Types d'enseignement actifs"><CheckGroup options={TYPE_OPTS} selected={profile.teaching_types} onToggle={(c) => toggleProfile('teaching_types', c)} /></Field>
            <Field label="Canaux de notification"><CheckGroup options={CHANNEL_OPTS} selected={profile.channels} onToggle={(c) => toggleProfile('channels', c)} /></Field>
          </div>
          <div className="mt-5 flex gap-2">
            <Button disabled={savingProfile}><Save size={16} /> {savingProfile ? 'Enregistrement...' : 'Enregistrer le profil'}</Button>
          </div>
        </Card>
      </form>
    </>
  );
}
