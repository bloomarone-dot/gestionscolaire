import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/api';

/**
 * §4.1 — cascade officielle Sous-système → Type → Cycle → Niveau → Série.
 * Chaque liste dépend des choix précédents ; la série est sautée si le niveau n'en a pas.
 * Partagé entre la création de classe (§4) et l'inscription élève (§6).
 *
 * Options :
 *  - enabledSubsystems / enabledTypes : codes activés pour l'école (§14, filtre amont).
 *    `null`/absent = tout proposé.
 */
export function useReferentielCascade({ enabledSubsystems = null, enabledTypes = null } = {}) {
  const [subsystems, setSubsystems] = useState([]);
  const [types, setTypes] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [levels, setLevels] = useState([]);
  const [series, setSeries] = useState([]);

  const [value, setValue] = useState({
    subsystem_code: '', type_code: '', cycle_code: '', level_code: '', series_code: '',
  });

  const allow = (list, enabled) =>
    (enabled == null ? list : list.filter((x) => enabled.includes(x.code)));

  // Sous-systèmes (au montage).
  useEffect(() => {
    api.fetchSubsystems()
      .then((data) => setSubsystems(allow(Array.isArray(data) ? data : [], enabledSubsystems)))
      .catch(() => setSubsystems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Types selon le sous-système.
  useEffect(() => {
    if (!value.subsystem_code) { setTypes([]); return; }
    api.fetchTeachingTypes(value.subsystem_code)
      .then((data) => setTypes(allow(Array.isArray(data) ? data : [], enabledTypes)))
      .catch(() => setTypes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // Cascade complète : série renseignée si elle existe pour le niveau.
  const isComplete = Boolean(value.level_code) && (!hasSeries || Boolean(value.series_code));

  return { subsystems, types, cycles, levels, series, value, select, reset, hasSeries, isComplete };
}
