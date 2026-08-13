import { useEffect, useState } from 'react';
import * as api from '../api/api';
import { useAuth } from '../context/useAuth';
import { schoolDisplayName } from '../utils/brand';
import {
  getEstablishmentUiLabels,
  isLanguageCenter,
  isPrimarySchool,
  periodOptions,
} from '../utils/establishmentKind';

export function useEstablishmentProfile() {
  const { selectedSchool } = useAuth();
  const [profile, setProfile] = useState(() => api.readCachedSchoolProfile());
  const [loading, setLoading] = useState(!profile);

  useEffect(() => {
    let cancelled = false;
    api.fetchMySchool()
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch(() => {
        if (!cancelled) {
          const cached = api.readCachedSchoolProfile();
          if (cached) setProfile(cached);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedSchool?.id]);

  useEffect(() => {
    function onUpdate(event) {
      if (event.detail?.id) setProfile(event.detail);
    }
    window.addEventListener('school-profile-updated', onUpdate);
    return () => window.removeEventListener('school-profile-updated', onUpdate);
  }, []);

  const kind = profile?.establishment_kind || selectedSchool?.establishment_kind || 'SCHOOL';
  const labels = getEstablishmentUiLabels(kind);
  const schoolName = schoolDisplayName(profile || selectedSchool);

  return {
    profile,
    loading,
    kind,
    schoolName,
    isLanguageCenter: isLanguageCenter(kind),
    isPrimarySchool: isPrimarySchool(kind),
    labels,
    periodOptions: periodOptions(kind),
    simplifiedBulletin: isLanguageCenter(kind),
  };
}
