import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as api from '../../api/api';
import CitySelect from '../../components/CitySelect';

// Style sobre / minimaliste (Tailwind, palette ardoise, peu de couleur).
const card = 'rounded-lg border border-solid border-slate-200 bg-white';
const label = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1';
const input = 'w-full rounded-md border border-solid border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500';

const SUBSYSTEMS = [['FRANCOPHONE', 'Francophone'], ['ANGLOPHONE', 'Anglophone']];
const TYPES = [['GENERAL', 'Général'], ['TECHNIQUE', 'Technique']];
const CHANNELS = [['SMS', 'SMS'], ['WHATSAPP', 'WhatsApp'], ['EMAIL', 'Email'], ['INTERNAL', 'Notif. interne']];

function Field({ label: lbl, required, children, hint }) {
  return (
    <div>
      <label className={label}>{lbl}{required && <span className="text-red-500"> *</span>}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function CheckGroup({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([value, lbl]) => {
        const on = selected.includes(value);
        return (
          <button
            type="button"
            key={value}
            onClick={() => onToggle(value)}
            className={`rounded-md border border-solid px-3 py-1.5 text-sm transition ${
              on
                ? 'border-slate-800 bg-slate-800 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

export default function SuperAdminSchoolFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: '', code: '', city: '', address: '', phone: '',
    subsystems: ['FRANCOPHONE'], teaching_types: ['GENERAL'], channels: ['INTERNAL'],
    admin_first_name: '', admin_last_name: '', admin_phone: '', admin_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [error, setError] = useState('');
  const [createdInfo, setCreatedInfo] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    api.getSchool(id)
      .then((s) => setForm((f) => ({
        ...f,
        name: s.name || '', code: s.code || '', city: s.city || '',
        address: s.address || '', phone: s.phone || '',
        subsystems: s.subsystems || [], teaching_types: s.teaching_types || [],
        channels: s.channels || [],
      })))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingData(false));
  }, [id, isEdit]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k, v) => setForm((f) => ({
    ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v],
  }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.subsystems.length) { setError('Sélectionnez au moins un sous-système.'); return; }
    if (!form.teaching_types.length) { setError("Sélectionnez au moins un type d'enseignement."); return; }
    setLoading(true);
    try {
      if (isEdit) {
        await api.updateSchool(id, {
          name: form.name, city: form.city, address: form.address, phone: form.phone,
        });
        await api.updateSchoolProfile(id, {
          subsystems: form.subsystems, teaching_types: form.teaching_types, channels: form.channels,
        });
        navigate('/superadmin/schools');
      } else {
        const school = await api.createSchool({
          name: form.name, code: form.code || null, city: form.city,
          address: form.address, phone: form.phone,
          subsystems: form.subsystems, teaching_types: form.teaching_types, channels: form.channels,
        });
        // Compte administrateur de l'établissement (login téléphone + mot de passe).
        if (form.admin_phone && form.admin_password) {
          await api.createSchoolAdmin(school.id, {
            phone: form.admin_phone, password: form.admin_password,
            first_name: form.admin_first_name || null, last_name: form.admin_last_name || null,
          });
        }
        setCreatedInfo({ name: school.name, phone: form.admin_phone });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (createdInfo) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className={`${card} p-6`}>
          <h2 className="text-lg font-semibold text-slate-800">Établissement créé</h2>
          <p className="mt-2 text-sm text-slate-600">
            <strong>{createdInfo.name}</strong> a été créé.
            {createdInfo.phone && <> L'administrateur se connecte avec le téléphone <strong>{createdInfo.phone}</strong>.</>}
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => navigate('/superadmin/schools')}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
              Retour à la liste
            </button>
            <button onClick={() => { setCreatedInfo(null); setForm((f) => ({ ...f, name: '', code: '', admin_phone: '', admin_password: '' })); }}
              className="rounded-md border border-solid border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Créer un autre
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingData) return <div className="text-sm text-slate-500">Chargement…</div>;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            {isEdit ? "Modifier l'établissement" : 'Nouvel établissement'}
          </h1>
          <p className="text-sm text-slate-500">Informations, profil pédagogique et canaux de notification.</p>
        </div>
        <button type="button" onClick={() => navigate('/superadmin/schools')}
          className="text-sm text-slate-500 hover:text-slate-800">← Retour</button>
      </div>

      {error && (
        <div className="rounded-md border border-solid border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <section className={`${card} p-5`}>
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Établissement</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nom de l'établissement" required>
            <input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Ex : Collège Bilingue La Réussite" />
          </Field>
          <Field label="Code" hint="Identifiant court, optionnel">
            <input className={input} value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="Ex : CBLR" />
          </Field>
          <Field label="Ville">
            <CitySelect name="city" value={form.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <input className={input} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+237 6XX XXX XXX" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Adresse">
              <input className={input} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Quartier, rue…" />
            </Field>
          </div>
        </div>
      </section>

      <section className={`${card} p-5`}>
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Profil pédagogique</h2>
        <p className="mb-4 text-xs text-slate-400">Conditionne les choix proposés lors de la création des classes (filtre amont).</p>
        <div className="space-y-4">
          <Field label="Sous-systèmes actifs" required>
            <CheckGroup options={SUBSYSTEMS} selected={form.subsystems} onToggle={(v) => toggle('subsystems', v)} />
          </Field>
          <Field label="Types d'enseignement actifs" required>
            <CheckGroup options={TYPES} selected={form.teaching_types} onToggle={(v) => toggle('teaching_types', v)} />
          </Field>
          <Field label="Canaux de notification">
            <CheckGroup options={CHANNELS} selected={form.channels} onToggle={(v) => toggle('channels', v)} />
          </Field>
        </div>
      </section>

      {!isEdit && (
        <section className={`${card} p-5`}>
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Administrateur de l'établissement</h2>
          <p className="mb-4 text-xs text-slate-400">Compte de connexion par téléphone + mot de passe (email non requis).</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nom"><input className={input} value={form.admin_last_name} onChange={(e) => set('admin_last_name', e.target.value)} /></Field>
            <Field label="Prénom"><input className={input} value={form.admin_first_name} onChange={(e) => set('admin_first_name', e.target.value)} /></Field>
            <Field label="Téléphone" required={false} hint="Identifiant de connexion de l'admin">
              <input className={input} type="tel" value={form.admin_phone} onChange={(e) => set('admin_phone', e.target.value)} placeholder="+237 6XX XXX XXX" />
            </Field>
            <Field label="Mot de passe">
              <input className={input} type="password" value={form.admin_password} onChange={(e) => set('admin_password', e.target.value)} placeholder="Min. 6 caractères" />
            </Field>
          </div>
        </section>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={loading}
          className="rounded-md bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60">
          {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : "Créer l'établissement"}
        </button>
        <button type="button" onClick={() => navigate('/superadmin/schools')}
          className="rounded-md border border-solid border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Annuler
        </button>
      </div>
    </form>
  );
}
