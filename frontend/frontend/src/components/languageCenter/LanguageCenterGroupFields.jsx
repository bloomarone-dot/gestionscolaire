import { useEffect, useMemo } from 'react';
import { Input, Select } from '../ui';
import { useCecrlLevels } from '../../hooks/useCecrlLevels';
import {
  LC_LANGUAGES,
  languageLabel,
  suggestGroupName,
} from '../../utils/languageCenter';

/**
 * Champs simplifiés pour créer un groupe (centre de langues) :
 * langue → niveau CECRL → créneau → nom du groupe.
 */
export default function LanguageCenterGroupFields({
  form,
  onChange,
  onSuggestName,
  teacherOptions = [],
}) {
  const { levels, loading } = useCecrlLevels();

  const suggestion = useMemo(
    () => suggestGroupName(form.level_code, form.langue, form.creneau),
    [form.level_code, form.langue, form.creneau],
  );

  useEffect(() => {
    if (!form.level_code || form.nomTouched) return;
    if (suggestion) onSuggestName?.(suggestion);
  }, [suggestion, form.level_code, form.nomTouched, onSuggestName]);

  const set = (patch) => onChange({ ...form, ...patch });

  return (
    <>
      <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Création simplifiée : choisissez la <strong>langue</strong> et le <strong>niveau CECRL</strong> (A1→C2).
        Pas de section francophone/anglophone ni de filière MINESEC.
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Langue enseignée <span className="text-red-500">*</span>
        </span>
        <Select
          required
          value={form.langue}
          onChange={(e) => set({ langue: e.target.value, nomTouched: false })}
        >
          {LC_LANGUAGES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Niveau CECRL <span className="text-red-500">*</span>
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
          Créneau horaire
        </span>
        <Input
          placeholder="Ex. Samedi 9h – 12h"
          value={form.creneau}
          onChange={(e) => set({ creneau: e.target.value, nomTouched: false })}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Nom du groupe <span className="text-red-500">*</span>
        </span>
        <Input
          required
          placeholder={suggestion || `Ex. A1 ${languageLabel(form.langue)} — Samedi 9h`}
          value={form.nom}
          onChange={(e) => set({ nom: e.target.value, nomTouched: true })}
        />
        {suggestion && !form.nomTouched && (
          <p className="mt-1 text-xs text-slate-400">Suggestion : {suggestion}</p>
        )}
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
          Formateur référent
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
