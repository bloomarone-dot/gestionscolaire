import { useEffect } from 'react';

export function useSchoolBranding(branding) {
  useEffect(() => {
    if (!branding?.primary_color && !branding?.secondary_color) return;

    const root = document.documentElement;
    const prevPrimary = root.style.getPropertyValue('--school-primary');
    const prevSecondary = root.style.getPropertyValue('--school-secondary');

    if (branding.primary_color) {
      root.style.setProperty('--school-primary', branding.primary_color);
      root.style.setProperty('--primary-500', branding.primary_color);
    }
    if (branding.secondary_color) {
      root.style.setProperty('--school-secondary', branding.secondary_color);
      root.style.setProperty('--accent-400', branding.secondary_color);
    }

    return () => {
      if (prevPrimary) root.style.setProperty('--school-primary', prevPrimary);
      else root.style.removeProperty('--school-primary');
      if (prevSecondary) root.style.setProperty('--school-secondary', prevSecondary);
      else root.style.removeProperty('--school-secondary');
    };
  }, [branding?.primary_color, branding?.secondary_color]);
}
