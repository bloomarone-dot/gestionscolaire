import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '../api/api';
import {
  fallbackCycles,
  fallbackLevels,
  fallbackSeries,
  fallbackSubsystems,
  fallbackTeachingTypes,
} from '../utils/referentielFallback';

/**
 * §4.1 — cascade officielle Sous-système → Type → Cycle → Niveau → Série.
 * Chaque liste dépend des choix précédents ; la série est sautée si le niveau n'en a pas.
 *
 * §14 — filtre amont : la cascade ne propose que les sous-systèmes / types **activés**
 * dans le profil de l'école. Si le profil n'est pas configuré (listes vides), tout est
 * proposé (rien n'est bloqué).
 *
 * options.excludeCycleCodes — ex. ['PRIMAIRE','CECRL'] pour collège/lycée.
 */
export function useReferentielCascade({
  enabledSubsystems = null,
  enabledTypes = null,
  excludeCycleCodes = null,
} = {}) {
  const [rawSubsystems, setRawSubsystems] = useState([]);
  const [rawTypes, setRawTypes] = useState([]);
  const [rawCycles, setRawCycles] = useState([]);
  const [levels, setLevels] = useState([]);
  const [series, setSeries] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);

  const [value, setValue] = useState({
    subsystem_code: '', type_code: '', cycle_code: '', level_code: '', series_code: '',
  });

  useEffect(() => {
    api.fetchMySchool().then(setProfile).catch(() => setProfile(api.readCachedSchoolProfile()));
  }, []);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    api.fetchSubsystems()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        if (list.length) {
          setRawSubsystems(list);
          setUsingFallback(false);
          return;
        }
        setRawSubsystems(fallbackSubsystems());
        setUsingFallback(true);
        setLoadError(
          'Référentiel vide : listes officielles de secours. Vous pouvez créer la classe.',
        );
      })
      .catch((err) => {
        setRawSubsystems(fallbackSubsystems());
        setUsingFallback(true);
        setLoadError(
          `${err.message || 'Référentiel injoignable.'} Listes officielles de secours — vous pouvez quand même créer la classe.`,
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const enabledSubs = useMemo(
    () => enabledSubsystems ?? (profile?.subsystems?.length ? profile.subsystems : null),
    [enabledSubsystems, profile],
  );
  const enabledTyp = useMemo(
    () => enabledTypes ?? (profile?.teaching_types?.length ? profile.teaching_types : null),
    [enabledTypes, profile],
  );

  const subsystems = useMemo(
    () => (enabledSubs == null ? rawSubsystems : rawSubsystems.filter((x) => enabledSubs.includes(x.code))),
    [rawSubsystems, enabledSubs],
  );
  const types = useMemo(
    () => (enabledTyp == null ? rawTypes : rawTypes.filter((x) => enabledTyp.includes(x.code))),
    [rawTypes, enabledTyp],
  );
  const cycles = useMemo(() => {
    if (!excludeCycleCodes?.length) return rawCycles;
    const blocked = new Set(excludeCycleCodes);
    return rawCycles.filter((c) => !blocked.has(c.code));
  }, [rawCycles, excludeCycleCodes]);

  useEffect(() => {
    if (!value.subsystem_code) { setRawTypes([]); return; }
    api.fetchTeachingTypes(value.subsystem_code)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setRawTypes(list.length ? list : fallbackTeachingTypes(value.subsystem_code));
      })
      .catch(() => setRawTypes(fallbackTeachingTypes(value.subsystem_code)));
  }, [value.subsystem_code]);

  useEffect(() => {
    if (!value.subsystem_code || !value.type_code) { setRawCycles([]); return; }
    api.fetchCycles(value.subsystem_code, value.type_code)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setRawCycles(list.length ? list : fallbackCycles(value.subsystem_code, value.type_code));
      })
      .catch(() => setRawCycles(fallbackCycles(value.subsystem_code, value.type_code)));
  }, [value.subsystem_code, value.type_code]);

  useEffect(() => {
    if (!value.subsystem_code || !value.type_code || !value.cycle_code) { setLevels([]); return; }
    api.fetchLevels(value.subsystem_code, value.type_code, value.cycle_code)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setLevels(list.length ? list : fallbackLevels(value.subsystem_code, value.type_code, value.cycle_code));
      })
      .catch(() => setLevels(fallbackLevels(value.subsystem_code, value.type_code, value.cycle_code)));
  }, [value.subsystem_code, value.type_code, value.cycle_code]);

  useEffect(() => {
    if (!value.level_code) {
      setSeries([]);
      setSeriesLoading(false);
      return;
    }
    let cancelled = false;
    setSeriesLoading(true);
    api.fetchLevelSeries(value.level_code)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) setSeries(list.length ? list : fallbackSeries(value.level_code));
      })
      .catch(() => {
        if (!cancelled) setSeries(fallbackSeries(value.level_code));
      })
      .finally(() => {
        if (!cancelled) setSeriesLoading(false);
      });
    return () => { cancelled = true; };
  }, [value.level_code]);

  const select = useCallback((field, code) => {
    setValue((prev) => {
      const next = { ...prev, [field]: code };
      if (field === 'subsystem_code') { next.type_code = ''; next.cycle_code = ''; next.level_code = ''; next.series_code = ''; }
      if (field === 'type_code') { next.cycle_code = ''; next.level_code = ''; next.series_code = ''; }
      if (field === 'cycle_code') { next.level_code = ''; next.series_code = ''; }
      if (field === 'level_code') { next.series_code = ''; }
      return next;
    });
  }, []);

  const reset = useCallback(() => setValue({
    subsystem_code: '', type_code: '', cycle_code: '', level_code: '', series_code: '',
  }), []);

  const hasSeries = series.length > 0;
  const isComplete = Boolean(value.level_code)
    && !seriesLoading
    && (!hasSeries || Boolean(value.series_code));

  /** Message clair : quelle étape manque. */
  function missingStepMessage() {
    if (!value.subsystem_code) return "Choisissez d'abord le sous-système (Francophone ou Anglophone).";
    if (!value.type_code) return "Choisissez le type d'enseignement (Général ou Technique).";
    if (!value.cycle_code) return "Choisissez le cycle : Premier cycle ou Second cycle.";
    if (!value.level_code) return "Choisissez le niveau (ex. 6ème, 3ème, 2nde, Terminale).";
    if (seriesLoading) return "Chargement des séries… un instant.";
    if (hasSeries && !value.series_code) return "Choisissez la série / spécialité (obligatoire pour ce niveau).";
    return '';
  }

  return {
    subsystems,
    types,
    cycles,
    levels,
    series,
    value,
    select,
    reset,
    hasSeries,
    isComplete,
    loading,
    seriesLoading,
    loadError,
    usingFallback,
    missingStepMessage,
  };
}
