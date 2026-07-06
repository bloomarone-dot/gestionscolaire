import { useEffect, useMemo } from 'react';
import { Input, Select } from '../ui';
import { usePrimaryLevels } from '../../hooks/usePrimaryLevels';
import {
  PRIMAIRE_SECTIONS,
  PS_SUBSYSTEM_FR,
  suggestPrimaryClassName,
} from '../../utils/primarySchool';

export default function PrimarySchoolGroupFields({
  form,
  onChange,
  onSuggestName,
  teacherOptions = [],
}) {
  const section = form.section || PS_SUBSYSTEM_FR;
  const { levels, loading } = usePrimaryLevels(section);

  const suggestion = useMemo(
    () => suggestPrimaryClassName(form.level_code, section, form.suffix),
    [form.level_code, section, form.suffix],
  );

  useEffect(() => {
    if (!form.level_code || form.nomTouched) return;
    if (suggestion) onSuggestName?.(suggestion);
  }, [suggestion, form.level_code, form.nomTouched, onSuggestName]);

  const set = (patch) => onChange({ ...form, ...patch });

  return (
    <>
      <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Création simplifiée pour l&apos;école primaire : maternelle (PS, MS, GS)
        ou élémentaire (SIL→CM2), section francophone ou anglophone (Class 1→6).
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Section <span className="text-red-500">*</span>
        </span>
        <Select
          required
          value={section}
          onChange={(e) => set({
            section: e.target.value,
            level_code: '',
            nomTouched: false,
          })}
        >
          {PRIMAIRE_SECTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Niveau <span className="text-red-500">*</span>
        </span>
        <Select
          required
          value={form.level_code}
          onChange={(e) => set({ level_code: e.target.value, nomTouched: false })}
          disabled={loading}
        >
          <option value="">{loading ? 'Chargement…' : 'Choisir le niveau…'}</option>
          {levels.map((level) => (
            <option key={level.code} value={level.code}>{level.name || level.code}</option>
          ))}
        </Select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Complément (optionnel)
        </span>
        <Input
          placeholder="Ex. A, B ou Matin"
          value={form.suffix}
          onChange={(e) => set({ suffix: e.target.value, nomTouched: false })}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Nom de la classe <span className="text-red-500">*</span>
        </span>
        <Input
          required
          placeholder={suggestion || 'Ex. CE1 — A'}
          value={form.nom}
          onChange={(e) => set({ nom: e.target.value, nomTouched: true })}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Effectif maximum
        </span>
        <Input
          type="number"
          min="1"
          value={form.effectif_max}
          onChange={(e) => set({ effectif_max: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Enseignant titulaire
        </span>
        <Select
          value={form.prof_principal_id}
          onChange={(e) => set({ prof_principal_id: e.target.value })}
        >
          <option value="">Aucun (optionnel)</option>
          {teacherOptions.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </label>
    </>
  );
}
