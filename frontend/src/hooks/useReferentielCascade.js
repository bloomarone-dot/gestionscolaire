import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '../api/api';

/**
 * §4.1 — cascade officielle Sous-système → Type → Cycle → Niveau → Série.
 * Chaque liste dépend des choix précédents ; la série est sautée si le niveau n'en a pas.
 * Partagé entre la création de classe (§4) et l'inscription élève (§6).
 *
 * §14 — filtre amont : la cascade ne propose que les sous-systèmes / types **activés**
 * dans le profil de l'école. Si le profil n'est pas configuré (listes vides), tout est
 * proposé (rien n'est bloqué). Des overrides explicites restent possibles via options.
 */
export function useReferentielCascade({ enabledSubsystems = null, enabledTypes = null } = {}) {
  const [rawSubsystems, setRawSubsystems] = useState([]);
  const [rawTypes, setRawTypes] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [levels, setLevels] = useState([]);
  const [series, setSeries] = useState([]);
  const [profile, setProfile] = useState(null);

  const [value, setValue] = useState({
    subsystem_code: '', type_code: '', cycle_code: '', level_code: '', series_code: '',
  });

  // Profil école (§14) — best-effort ; en cas d'échec, on ne filtre pas.
  useEffect(() => {
    api.fetchMySchool().then(setProfile).catch(() => setProfile(null));
  }, []);

  // Sous-systèmes (au montage).
  useEffect(() => {
    api.fetchSubsystems()
      .then((data) => setRawSubsystems(Array.isArray(data) ? data : []))
      .catch(() => setRawSubsystems([]));
  }, []);

  // Codes activés : option explicite > profil école > tout (null).
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

  // Types selon le sous-système.
  useEffect(() => {
    if (!value.subsystem_code) { setRawTypes([]); return; }
    api.fetchTeachingTypes(value.subsystem_code)
      .then((data) => setRawTypes(Array.isArray(data) ? data : []))
      .catch(() => setRawTypes([]));
  }, [value.subsystem_code]);

  // Cycles selon sous-système + type.
  useEffect(() => {
    if (!value.subsystem_code || !value.type_code) { setCycles([]); return; }
    api.fetchCycles(value.subsystem_code, value.type_code)
      .then((data) => setCycles(Array.isArray(data) ? data : []))
      .catch(() => setCycles([]));
  }, [value.subsystem_code, value.type_code]);

  // Niveaux selon sous-système + type + cycle.
  useEffect(() => {
    if (!value.subsystem_code || !value.type_code || !value.cycle_code) { setLevels([]); return; }
    api.fetchLevels(value.subsystem_code, value.type_code, value.cycle_code)
      .then((data) => setLevels(Array.isArray(data) ? data : []))
      .catch(() => setLevels([]));
  }, [value.subsystem_code, value.type_code, value.cycle_code]);

  // Séries selon le niveau (peut être vide → étape sautée).
  useEffect(() => {
    if (!value.level_code) { setSeries([]); return; }
    api.fetchLevelSeries(value.level_code)
      .then((data) => setSeries(Array.isArray(data) ? data : []))
      .catch(() => setSeries([]));
  }, [value.level_code]);

  // Setters qui réinitialisent l'aval (cascade cohérente).
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
  const isComplete = Boolean(value.level_code) && (!hasSeries || Boolean(value.series_code));

  return { subsystems, types, cycles, levels, series, value, select, reset, hasSeries, isComplete };
}
