import { useEffect, useState } from 'react';
import * as api from '../api/api';
import {
  PRIMAIRE_EN_LEVELS,
  PRIMAIRE_FR_LEVELS,
  PS_CYCLE,
  PS_SUBSYSTEM_EN,
  PS_SUBSYSTEM_FR,
  PS_TYPE,
} from '../utils/primarySchool';

export function usePrimaryLevels(section = PS_SUBSYSTEM_FR) {
  const fallback = section === PS_SUBSYSTEM_EN ? PRIMAIRE_EN_LEVELS : PRIMAIRE_FR_LEVELS;
  const [levels, setLevels] = useState(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .fetchLevels(section, PS_TYPE, PS_CYCLE)
      .then((data) => {
        if (cancelled) return;
        setLevels(Array.isArray(data) && data.length ? data : fallback);
      })
      .catch(() => {
        if (!cancelled) setLevels(fallback);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

  return { levels, loading };
}
