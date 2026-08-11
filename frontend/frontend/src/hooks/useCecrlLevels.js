import { useEffect, useState } from 'react';
import * as api from '../api/api';
import {
  LC_CYCLE,
  LC_LEVELS_FALLBACK,
  LC_SUBSYSTEM,
  LC_TYPE,
} from '../utils/languageCenter';

export function useCecrlLevels() {
  const [levels, setLevels] = useState(LC_LEVELS_FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .fetchLevels(LC_SUBSYSTEM, LC_TYPE, LC_CYCLE)
      .then((data) => {
        if (cancelled) return;
        setLevels(Array.isArray(data) && data.length ? data : LC_LEVELS_FALLBACK);
      })
      .catch(() => {
        if (!cancelled) setLevels(LC_LEVELS_FALLBACK);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { levels, loading };
}
