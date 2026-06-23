import { useEffect, useState } from 'react';
import * as api from '../api/api';
import {
  getEstablishmentUiLabels,
  isLanguageCenter,
  periodOptions,
} from '../utils/establishmentKind';

export function useEstablishmentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.fetchMySchool()
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const kind = profile?.establishment_kind || 'SCHOOL';
  const labels = getEstablishmentUiLabels(kind);

  return {
    profile,
    loading,
    kind,
    isLanguageCenter: isLanguageCenter(kind),
    labels,
    periodOptions: periodOptions(kind),
    simplifiedBulletin: isLanguageCenter(kind),
  };
}
