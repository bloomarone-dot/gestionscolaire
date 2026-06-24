import { useEffect, useState } from 'react';
import * as api from '../../api/api';
import { Select } from '../ui';
import { useCecrlLevels } from '../../hooks/useCecrlLevels';
import { LC_TYPE, buildLanguageCenterEnrollmentCodes, cecrlLevelLabel } from '../../utils/languageCenter';
import { classRow } from '../../pages/modern/operations/shared';

/**
 * Inscription centre de langues : niveau CECRL → groupe correspondant.
 */
export default function LanguageCenterEnrollmentFields({ levelCode, groupeId, onLevelChange, onGroupeChange }) {
  const { levels, loading } = useCecrlLevels();
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    if (!levelCode) {
      setGroups([]);
      onGroupeChange?.('');
      return;
    }
    let cancelled = false;
    setLoadingGroups(true);
    api
      .fetchClasses({ type: LC_TYPE, level: levelCode })
      .then((data) => {
        if (cancelled) return;
        setGroups((data || []).map(classRow));
        onGroupeChange?.('');
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingGroups(false);
      });
    return () => { cancelled = true; };
  }, [levelCode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="md:col-span-2 grid gap-4 md:grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        Niveau et groupe
      </p>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Niveau visé (CECRL) <span className="text-red-500">*</span>
        </span>
        <Select
          required
          value={levelCode}
          onChange={(e) => onLevelChange?.(e.target.value)}
          disabled={loading}
        >
          <option value="">{loading ? 'Chargement…' : 'Choisir A1, A2, B1…'}</option>
          {levels.map((level) => (
            <option key={level.code} value={level.code}>{level.name || level.code}</option>
          ))}
        </Select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Groupe <span className="text-red-500">*</span>
        </span>
        <Select
          required
          value={groupeId}
          onChange={(e) => onGroupeChange?.(e.target.value)}
          disabled={!levelCode || loadingGroups}
        >
          <option value="">
            {!levelCode
              ? 'Choisissez d’abord le niveau'
              : loadingGroups
                ? 'Chargement des groupes…'
                : groups.length
                  ? 'Sélectionner le groupe…'
                  : `Aucun groupe ${cecrlLevelLabel(levels, levelCode)} — créez-le d’abord`}
          </option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.level})
            </option>
          ))}
        </Select>
      </label>

      {levelCode && !loadingGroups && groups.length === 0 && (
        <p className="md:col-span-2 text-xs text-amber-700">
          Aucun groupe pour le niveau {levelCode}. Créez un groupe depuis le menu Groupes avant d’inscrire.
        </p>
      )}
    </div>
  );
}

export { buildLanguageCenterEnrollmentCodes };
