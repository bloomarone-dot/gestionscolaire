import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Check, Eye, EyeOff, Globe2, KeyRound, Loader2,
  Mail, Moon, Phone, ShieldCheck, Sun, User as UserIcon, UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { roleLabel } from '../../utils/navConfig';
import { Avatar, Button } from '../../components/ui';

const TABS = ['info', 'security', 'preferences'];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('info');
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved

  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Admin École';

  const [form, setForm] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const updatePasswordField = (field) => (event) => {
    setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  // TODO (backend) : remplacer ce bloc par un vrai appel API, ex.
  // await api.patch('/me', form) puis mettre à jour le contexte auth.
  const handleSaveInfo = (event) => {
    event.preventDefault();
    setSaveState('saving');
    setTimeout(() => {
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    }, 700);
  };

  // TODO (backend) : remplacer ce bloc par un vrai appel API, ex.
  // await api.post('/me/password', passwordForm)
  const handleUpdatePassword = (event) => {
    event.preventDefault();
    setSaveState('saving');
    setTimeout(() => {
      setSaveState('saved');
      setPasswordForm({ current: '', next: '', confirm: '' });
      setTimeout(() => setSaveState('idle'), 2000);
    }, 700);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        {t('backToDashboard')}
      </button>

      {/* Bandeau + avatar */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-28 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 sm:h-32" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col items-start gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-white shadow-md sm:h-28 sm:w-28">
                  <Avatar name={name} />
                </div>
                <button
                  type="button"
                  title={t('changeAvatar')}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-md transition hover:bg-blue-700"
                >
                  <Camera size={14} />
                </button>
              </div>
              <div className="pb-1">
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                    <ShieldCheck size={12} />
                    {roleLabel(user?.role) || t('administrator')}
                  </span>
                  {user?.email && (
                    <span className="text-xs text-slate-500">{user.email}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Titre + sous-titre */}
      <div className="mt-6">
        <h2 className="text-lg font-extrabold text-slate-900">{t('profileTitle')}</h2>
        <p className="text-sm text-slate-500">{t('profileSubtitle')}</p>
      </div>

      {/* Onglets */}
      <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
              activeTab === tab ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab === 'info' && <UserIcon size={15} />}
            {tab === 'security' && <KeyRound size={15} />}
            {tab === 'preferences' && <Globe2 size={15} />}
            {tab === 'info' && t('tabInfo')}
            {tab === 'security' && t('tabSecurity')}
            {tab === 'preferences' && t('tabPreferences')}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        {activeTab === 'info' && (
          <form onSubmit={handleSaveInfo} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t('firstName')} icon={UserRound}>
                <input
                  value={form.firstName}
                  onChange={updateField('firstName')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label={t('lastName')} icon={UserRound}>
                <input
                  value={form.lastName}
                  onChange={updateField('lastName')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label={t('email')} icon={Mail}>
                <input
                  type="email"
                  value={form.email}
                  onChange={updateField('email')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label={t('phone')} icon={Phone}>
                <input
                  value={form.phone}
                  onChange={updateField('phone')}
                  placeholder="+237 6XX XXX XXX"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label={t('username')} icon={UserIcon}>
                <input
                  disabled
                  value={user?.username || ''}
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none"
                />
              </Field>
              <Field label={t('role')} icon={ShieldCheck}>
                <input
                  disabled
                  value={roleLabel(user?.role) || ''}
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none"
                />
              </Field>
            </div>

            <BackendNotice text={t('backendPendingNotice')} />
            <SaveBar state={saveState} label={t('saveChanges')} savingLabel={t('saving')} savedLabel={t('savedConfirmation')} />
          </form>
        )}

        {activeTab === 'security' && (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <Field label={t('currentPassword')} icon={KeyRound}>
              <PasswordInput
                value={passwordForm.current}
                onChange={updatePasswordField('current')}
                show={showPasswords}
                toggle={() => setShowPasswords((v) => !v)}
              />
            </Field>
            <Field label={t('newPassword')} icon={KeyRound} hint={t('passwordHint')}>
              <PasswordInput
                value={passwordForm.next}
                onChange={updatePasswordField('next')}
                show={showPasswords}
                toggle={() => setShowPasswords((v) => !v)}
              />
            </Field>
            <Field label={t('confirmPassword')} icon={KeyRound}>
              <PasswordInput
                value={passwordForm.confirm}
                onChange={updatePasswordField('confirm')}
                show={showPasswords}
                toggle={() => setShowPasswords((v) => !v)}
              />
            </Field>

            <BackendNotice text={t('backendPendingNotice')} />
            <SaveBar state={saveState} label={t('updatePassword')} savingLabel={t('saving')} savedLabel={t('savedConfirmation')} />
          </form>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-4">
            <PreferenceRow
              icon={Globe2}
              title={t('languagePrefTitle')}
              desc={t('languagePrefDesc')}
            >
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => lang !== 'fr' && toggleLang()}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition ${
                    lang === 'fr' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => lang !== 'en' && toggleLang()}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition ${
                    lang === 'en' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  EN
                </button>
              </div>
            </PreferenceRow>

            <PreferenceRow
              icon={theme === 'dark' ? Moon : Sun}
              title={t('themePrefTitle')}
              desc={t('themePrefDesc')}
            >
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold transition ${
                    theme === 'light' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Sun size={13} /> {t('themeLight')}
                </button>
                <button
                  type="button"
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold transition ${
                    theme === 'dark' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Moon size={13} /> {t('themeDark')}
                </button>
              </div>
            </PreferenceRow>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <Icon size={13} /> {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function PasswordInput({ value, onChange, show, toggle }) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function PreferenceRow({ icon: Icon, title, desc, children }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <Icon size={16} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function BackendNotice({ text }) {
  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
      {text}
    </p>
  );
}

function SaveBar({ state, label, savingLabel, savedLabel }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <Button type="submit" disabled={state === 'saving'} className="min-w-[11rem] justify-center">
        {state === 'saving' && <Loader2 size={16} className="animate-spin" />}
        {state === 'saved' && <Check size={16} />}
        {state === 'saving' ? savingLabel : state === 'saved' ? savedLabel : label}
      </Button>
    </div>
  );
}