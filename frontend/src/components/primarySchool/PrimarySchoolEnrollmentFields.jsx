import { useEffect, useState } from 'react';
import * as api from '../../api/api';
import { Select } from '../ui';
import { usePrimaryLevels } from '../../hooks/usePrimaryLevels';
import {
  PRIMAIRE_SECTIONS,
  PS_CYCLE,
  PS_SUBSYSTEM_FR,
  PS_TYPE,
} from '../../utils/primarySchool';
import { classRow } from '../../pages/modern/operations/shared';

/**
 * Inscription école primaire : section → niveau → classe correspondante.
 */
export default function PrimarySchoolEnrollmentFields({
  section,
  levelCode,
  classeId,
  onSectionChange,
  onLevelChange,
  onClasseChange,
}) {
  const currentSection = section || PS_SUBSYSTEM_FR;
  const { levels, loading } = usePrimaryLevels(currentSection);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  useEffect(() => {
    if (!levelCode) {
      setClasses([]);
      onClasseChange?.('');
      return;
    }
    let cancelled = false;
    setLoadingClasses(true);
    api
      .fetchClasses({
        subsystem: currentSection,
        type: PS_TYPE,
        cycle: PS_CYCLE,
        level: levelCode,
      })
      .then((data) => {
        if (cancelled) return;
        setClasses((data || []).map(classRow));
        onClasseChange?.('');
      })
      .catch(() => {
        if (!cancelled) setClasses([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingClasses(false);
      });
    return () => { cancelled = true; };
  }, [levelCode, currentSection]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="md:col-span-2 grid gap-4 md:grid-cols-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <p className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-emerald-800">
        Section, niveau et classe
      </p>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Section <span className="text-red-500">*</span>
        </span>
        <Select
          required
          value={currentSection}
          onChange={(e) => {
            onSectionChange?.(e.target.value);
            onLevelChange?.('');
          }}
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
          value={levelCode}
          onChange={(e) => onLevelChange?.(e.target.value)}
          disabled={loading}
        >
          <option value="">{loading ? 'Chargement…' : 'Choisir le niveau…'}</option>
          {levels.map((level) => (
            <option key={level.code} value={level.code}>{level.name || level.code}</option>
          ))}
        </Select>
      </label>

      <label className="block md:col-span-2">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Classe <span className="text-red-500">*</span>
        </span>
        <Select
          required
          value={classeId}
          onChange={(e) => onClasseChange?.(e.target.value)}
          disabled={!levelCode || loadingClasses}
        >
          <option value="">
            {!levelCode
              ? 'Choisissez d’abord le niveau'
              : loadingClasses
                ? 'Chargement des classes…'
                : classes.length
                  ? 'Sélectionner la classe…'
                  : 'Aucune classe pour ce niveau — créez-la d’abord'}
          </option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.level})
            </option>
          ))}
        </Select>
      </label>

      {levelCode && !loadingClasses && classes.length === 0 && (
        <p className="md:col-span-2 text-xs text-amber-700">
          Aucune classe pour ce niveau. Créez une classe depuis le menu Classes avant d’inscrire.
        </p>
      )}
    </div>
  );
}
