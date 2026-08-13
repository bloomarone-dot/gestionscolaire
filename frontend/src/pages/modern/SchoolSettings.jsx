import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, FileText, GraduationCap, LayoutTemplate, Palette, Plus, RotateCcw,
  Save, Star, Trash2, TrendingUp, Upload, UserCog, Wallet,
} from 'lucide-react';
import * as api from '../../api/api';
import { useAuth } from '../../context/useAuth';
import { Button, Card, Input, PageHeader, Select } from '../../components/ui';
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

/* Sections affichées dans la navigation latérale — ancre + icône + couleur */
const SECTIONS = [
  ['etablissement', 'Établissement', Building2, 'blue'],
  ['entete', 'En-tête du bulletin', FileText, 'amber'],
  ['modeles', 'Modèles de bulletin', LayoutTemplate, 'violet'],
  ['apparence', 'Apparence par section', Palette, 'rose'],
  ['bareme', 'Barème des appréciations', Star, 'emerald'],
  ['personnel', 'Personnel & rôles', UserCog, 'slate'],
  ['frais', 'Frais de scolarité', Wallet, 'blue'],
  ['pedagogique', 'Profil pédagogique', GraduationCap, 'violet'],
];

const TONE_STYLES = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
};

/* Carte de section uniforme : badge icône + titre + description + zone d'actions */
function SectionCard({ id, icon: Icon, tone = 'blue', title, description, actions, children }) {
  return (
    <Card id={id} className="scroll-mt-6 p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_STYLES[tone]}`}>
            <Icon size={20} />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
            {description && <p className="mt-0.5 max-w-2xl text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </Card>
  );
}

function SideNav({ activeHint }) {
  return (
    <nav className="sticky top-6 hidden max-h-[calc(100vh-3rem)] space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sections</p>
      {SECTIONS.map(([id, label, Icon]) => (
        <a
          key={id}
          href={`#${id}`}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <Icon size={16} className="text-slate-400" />
          {label}
        </a>
      ))}
      {activeHint}
    </nav>
  );
}

function MobileSectionTabs() {
  return (
    <div className="-mx-1 mb-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
      {SECTIONS.map(([id, label, Icon]) => (
        <a
          key={id}
          href={`#${id}`}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm"
        >
          <Icon size={14} /> {label}
        </a>
      ))}
    </div>
  );
}

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
              on ? 'bg-blue-600 text-white ring-blue-600 shadow-sm' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
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
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
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

const MONTHS = [
  [1, 'Janvier'], [2, 'Février'], [3, 'Mars'], [4, 'Avril'], [5, 'Mai'], [6, 'Juin'],
  [7, 'Juillet'], [8, 'Août'], [9, 'Septembre'], [10, 'Octobre'], [11, 'Novembre'], [12, 'Décembre'],
];

const EMPTY_FEE = {
  inscription: '', tranche1: '', tranche2: '', tranche3: '',
  t1_start_month: '', t1_end_month: '', t2_start_month: '', t2_end_month: '',
  t3_start_month: '', t3_end_month: '',
};

function MonthRange({ label, start, end, onStart, onEnd }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <Select value={start} onChange={(e) => onStart(e.target.value)}>
          <option value="">Début…</option>
          {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <span className="text-slate-400">→</span>
        <Select value={end} onChange={(e) => onEnd(e.target.value)}>
          <option value="">Fin…</option>
          {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>
    </div>
  );
}

function FeesScheduleCard() {
  const [classes, setClasses] = useState([]);
  const [schedulesById, setSchedulesById] = useState({});
  const [classeId, setClasseId] = useState('');
  const [fee, setFee] = useState(EMPTY_FEE);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      api.fetchClasses().catch(() => []),
      api.fetchFeeSchedules().catch(() => []),
    ]).then(([cls, fees]) => {
      setClasses(Array.isArray(cls) ? cls : []);
      const map = {};
      (fees || []).forEach((f) => { map[f.classe_id] = f; });
      setSchedulesById(map);
    });
  }, []);

  useEffect(() => {
    if (!classeId) { setFee(EMPTY_FEE); return; }
    const s = schedulesById[classeId];
    setFee(s ? {
      inscription: s.inscription ?? '', tranche1: s.tranche1 ?? '', tranche2: s.tranche2 ?? '', tranche3: s.tranche3 ?? '',
      t1_start_month: s.t1_start_month ?? '', t1_end_month: s.t1_end_month ?? '',
      t2_start_month: s.t2_start_month ?? '', t2_end_month: s.t2_end_month ?? '',
      t3_start_month: s.t3_start_month ?? '', t3_end_month: s.t3_end_month ?? '',
    } : EMPTY_FEE);
  }, [classeId, schedulesById]);

  const setF = (k, v) => setFee((f) => ({ ...f, [k]: v }));
  const num = (v) => (v === '' || v == null ? 0 : Number(v));
  const monthOrNull = (v) => (v === '' || v == null ? null : Number(v));

  async function save() {
    if (!classeId) { setErr('Choisissez une classe.'); return; }
    setSaving(true); setMsg(''); setErr('');
    try {
      const classe = classes.find((c) => String(c.id) === String(classeId));
      const saved = await api.saveFeeSchedule(classeId, {
        classe_nom: classe?.nom || classe?.nom_personnalise || null,
        inscription: num(fee.inscription),
        tranche1: num(fee.tranche1),
        tranche2: num(fee.tranche2),
        tranche3: num(fee.tranche3),
        t1_start_month: monthOrNull(fee.t1_start_month),
        t1_end_month: monthOrNull(fee.t1_end_month),
        t2_start_month: monthOrNull(fee.t2_start_month),
        t2_end_month: monthOrNull(fee.t2_end_month),
        t3_start_month: monthOrNull(fee.t3_start_month),
        t3_end_month: monthOrNull(fee.t3_end_month),
      });
      setSchedulesById((m) => ({ ...m, [classeId]: saved }));
      setMsg('Grille de frais enregistrée pour cette classe.');
    } catch (e) {
      setErr(e.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  const total = num(fee.inscription) + num(fee.tranche1) + num(fee.tranche2) + num(fee.tranche3);

  return (
    <SectionCard
      id="frais"
      icon={Wallet}
      tone="blue"
      title="Frais de scolarité par classe"
      description="Montant de l'inscription (à part) et des 3 tranches de pension, ainsi que la période couverte par chaque tranche. Ces montants alimentent l'inscription et le suivi des paiements."
    >
      {msg && <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}
      {err && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{err}</div>}

      <div className="mb-4 max-w-md">
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Classe</span>
        <Select value={classeId} onChange={(e) => setClasseId(e.target.value)}>
          <option value="">— Choisir une classe —</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom || c.nom_personnalise || `Classe ${c.id}`}
              {schedulesById[c.id] ? ' ✓' : ''}
            </option>
          ))}
        </Select>
      </div>

      {classeId && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Inscription (XAF)</span>
              <Input type="number" min="0" value={fee.inscription} onChange={(e) => setF('inscription', e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">1ère tranche (XAF)</span>
              <Input type="number" min="0" value={fee.tranche1} onChange={(e) => setF('tranche1', e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">2ème tranche (XAF)</span>
              <Input type="number" min="0" value={fee.tranche2} onChange={(e) => setF('tranche2', e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">3ème tranche (XAF)</span>
              <Input type="number" min="0" value={fee.tranche3} onChange={(e) => setF('tranche3', e.target.value)} />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <MonthRange
              label="Période 1ère tranche"
              start={fee.t1_start_month} end={fee.t1_end_month}
              onStart={(v) => setF('t1_start_month', v)} onEnd={(v) => setF('t1_end_month', v)}
            />
            <MonthRange
              label="Période 2ème tranche"
              start={fee.t2_start_month} end={fee.t2_end_month}
              onStart={(v) => setF('t2_start_month', v)} onEnd={(v) => setF('t2_end_month', v)}
            />
            <MonthRange
              label="Période 3ème tranche"
              start={fee.t3_start_month} end={fee.t3_end_month}
              onStart={(v) => setF('t3_start_month', v)} onEnd={(v) => setF('t3_end_month', v)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <p className="text-sm text-slate-600">
              Total annuel : <b className="text-slate-900">{total.toLocaleString('fr-FR')} XAF</b>
            </p>
            <Button type="button" onClick={save} disabled={saving}>
              <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer cette classe'}
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export function SettingsPage() {
  const { user, selectedSchool } = useAuth();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [appreciationScales, setAppreciationScales] = useState(DEFAULT_APPRECIATION_SCALES);
  const [bulletinTheme, setBulletinTheme] = useState({ ...DEFAULT_BULLETIN_THEME });
  const [themeFrancophone, setThemeFrancophone] = useState({ ...DEFAULT_BULLETIN_THEME });
  const [themeAnglophone, setThemeAnglophone] = useState({ ...DEFAULT_BULLETIN_THEME });
  const [themeSection, setThemeSection] = useState('francophone');
  // Conservés pour ne pas écraser le profil legacy déjà en base à l'enregistrement.
  const [layoutProfile, setLayoutProfile] = useState(null);
  const [bulletinReferenceUrl, setBulletinReferenceUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({ subsystems: [], teaching_types: [], channels: ['INTERNAL'] });
  const [personnelAutoRoles, setPersonnelAutoRoles] = useState(false);
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
        setProfile({
          subsystems: s.subsystems || [],
          teaching_types: s.teaching_types || [],
          channels: s.channels?.length ? s.channels : ['INTERNAL'],
        });
        setPersonnelAutoRoles(Boolean(s.operational_settings?.personnel_auto_roles));
      } catch (err) {
        if (active) setError(err.message || "Impossible de charger l'etablissement.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user?.role, selectedSchool?.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
        operational_settings: {
          personnel_auto_roles: personnelAutoRoles,
          fonction_auth_roles: school.operational_settings?.fonction_auth_roles || {},
        },
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

  if (loading) {
    return (
      <>
        <PageHeader title="Paramètres établissement" />
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          Chargement des paramètres…
        </div>
      </>
    );
  }
  if (!school) {
    return (
      <>
        <PageHeader title="Paramètres établissement" />
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm">
          {error || (user?.role === 'superadmin'
            ? 'Sélectionnez un établissement en haut de page pour configurer le bulletin.'
            : 'Établissement introuvable.')}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
        <PageHeader
          title="Paramètres établissement"
          description="Profil, logo, couleurs du bulletin par section, barème des appréciations — chaque établissement a son modèle."
          breadcrumb="Établissement / Paramètres"
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 shadow-sm"
          onClick={() => navigate('/app/progression/policies')}
        >
          <TrendingUp size={16} /> Politiques de progression
        </Button>
      </div>

      {notice && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm">{notice}</div>}
      {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm">{error}</div>}

      <MobileSectionTabs />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-start">
        <SideNav />

        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <SectionCard id="etablissement" icon={Building2} tone="blue" title="Établissement" description="Coordonnées générales de l'établissement.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nom de l'etablissement"><Input required value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
                <Field label="Ville"><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
                <Field label="Telephone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+237 6XX XXX XXX" /></Field>
                <Field label="Adresse"><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
              </div>
            </SectionCard>

            <SectionCard
              id="entete"
              icon={FileText}
              tone="amber"
              title="En-tête du bulletin"
              description="Ces informations apparaissent en haut de chaque bulletin officiel (en-tête bilingue MINESEC)."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Devise de l'etablissement" hint="Ex : a chosen generation"><Input value={form.bulletin_motto} onChange={(e) => set('bulletin_motto', e.target.value)} /></Field>
                <Field label="Boite postale" hint="Ex : BP 20142 Yaounde - 6XX XXX XXX"><Input value={form.bulletin_po_box} onChange={(e) => set('bulletin_po_box', e.target.value)} /></Field>
                <Field label="Delegation regionale" hint="Ex : REGIONAL DELEGATION FOR CENTER"><Input value={form.bulletin_delegation_regional} onChange={(e) => set('bulletin_delegation_regional', e.target.value)} /></Field>
                <Field label="Delegation departementale" hint="Ex : DIVISIONAL DELEGATION FOR MEFOU AND AFAMBA"><Input value={form.bulletin_delegation_departementale} onChange={(e) => set('bulletin_delegation_departementale', e.target.value)} /></Field>
                <Field label="Note de rentree" hint="Ex : Next term re-opens: April 20th, 2026"><Input value={form.bulletin_next_term_note} onChange={(e) => set('bulletin_next_term_note', e.target.value)} /></Field>
                <Field label="Logo du bulletin" hint="Image affichee au centre de l en-tete (PNG/JPG)">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                      <Upload size={16} /> Telecharger le logo
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                    {form.logo_url && (
                      <img src={form.logo_url} alt="Apercu logo" className="h-20 w-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm" />
                    )}
                  </div>
                </Field>
                <Field label="Logo (URL alternative)" hint="Ou coller un lien https://..."><Input value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://..." /></Field>
              </div>
            </SectionCard>

            <div data-testid="school-settings-bulletin-modeles">
              <SectionCard
                id="modeles"
                icon={LayoutTemplate}
                tone="violet"
                title="Modèle de bulletin"
                description="Créez et personnalisez le bulletin de votre établissement avec notre éditeur visuel."
                actions={(
                  <Button
                    type="button"
                    variant="secondary"
                    data-testid="manage-bulletin-modeles"
                    onClick={() => navigate('/app/bulletins/modeles')}
                  >
                    Gérer mes modèles
                  </Button>
                )}
              >
                <p className="text-sm text-slate-500">
                  Choisissez une mise en page, ajustez les blocs et prévisualisez le rendu final avant application.
                </p>
              </SectionCard>
            </div>

            <SectionCard
              id="apparence"
              icon={Palette}
              tone="rose"
              title="Apparence du bulletin par section"
              description={"Couleurs distinctes pour la section francophone et anglophone. Le bulletin d'une classe Form utilise le modèle anglophone ; une classe 6ème, 2nde, etc. utilise le modèle francophone."}
            >
              <div className="mb-4 inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                {[
                  ['francophone', 'Francophone (BULLETIN, PREMIER GROUPE…)'],
                  ['anglophone', 'Anglophone (REPORT CARD, FIRST GROUP…)'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setThemeSection(key)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      themeSection === key
                        ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-700'
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
            </SectionCard>

            <SectionCard
              id="bareme"
              icon={Star}
              tone="emerald"
              title="Barème des appréciations"
              description="Colonne « Appr. » du bulletin (MVP §14). Personnalisez les seuils par sous-système."
              actions={(
                <Button type="button" variant="secondary" onClick={() => setAppreciationScales(DEFAULT_APPRECIATION_SCALES)}>
                  <RotateCcw size={16} /> Valeurs par défaut
                </Button>
              )}
            >
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
            </SectionCard>

            <SectionCard
              id="personnel"
              icon={UserCog}
              tone="slate"
              title="Personnel & rôles"
              description="Attribution automatique du rôle de connexion selon la fonction (instituteur → enseignant, directeur → direction, agent de sécurité → direction, etc.)."
            >
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={personnelAutoRoles}
                  onChange={(e) => setPersonnelAutoRoles(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Activer l'attribution automatique des rôles à la création / modification du personnel
              </label>
            </SectionCard>

            {/* Barre d'enregistrement toujours visible */}
            <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
              <p className="text-sm text-slate-500">Les modifications s'appliquent aux prochains bulletins générés.</p>
              <Button disabled={saving}><Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}</Button>
            </div>
          </form>

          <FeesScheduleCard />

          <form onSubmit={handleProfileSubmit}>
            <SectionCard
              id="pedagogique"
              icon={GraduationCap}
              tone="violet"
              title="Profil pédagogique & communication"
              description="Sous-systèmes et types d'enseignement activés (§14) : la cascade de création ne proposera que ces options. Laissez vide pour tout autoriser. Canaux de notification activés (§12.2)."
            >
              <div className="space-y-4">
                <Field label="Sous-systèmes actifs"><CheckGroup options={SUBSYSTEM_OPTS} selected={profile.subsystems} onToggle={(c) => toggleProfile('subsystems', c)} /></Field>
                <Field label="Types d'enseignement actifs"><CheckGroup options={TYPE_OPTS} selected={profile.teaching_types} onToggle={(c) => toggleProfile('teaching_types', c)} /></Field>
                <Field label="Canaux de notification"><CheckGroup options={CHANNEL_OPTS} selected={profile.channels} onToggle={(c) => toggleProfile('channels', c)} /></Field>
              </div>
              <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                <Button disabled={savingProfile}><Save size={16} /> {savingProfile ? 'Enregistrement...' : 'Enregistrer le profil'}</Button>
              </div>
            </SectionCard>
          </form>
        </div>
      </div>
    </div>
  );
}