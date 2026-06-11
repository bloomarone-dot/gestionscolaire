import { useEffect, useCallback } from 'react';

const MOBILE_BP = 992;

function isMobileViewport() {
  return window.innerWidth < MOBILE_BP;
}

export function toggleSidebar() {
  if (isMobileViewport()) {
    document.body.classList.toggle('sidebar-open');
  } else {
    document.body.classList.toggle('sidebar-collapse');
  }
}

export function closeMobileSidebar() {
  document.body.classList.remove('sidebar-open');
}

export default function useAdminLTE(deps = []) {
  useEffect(() => {
    document.body.classList.add(
      'hold-transition',
      'sidebar-mini',
      'layout-fixed',
      'layout-navbar-fixed',
    );

    const onResize = () => {
      if (!isMobileViewport()) {
        document.body.classList.remove('sidebar-open');
      }
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      document.body.classList.remove(
        'hold-transition',
        'sidebar-mini',
        'layout-fixed',
        'layout-navbar-fixed',
        'sidebar-open',
        'sidebar-collapse',
      );
    };
  }, []);

  const handleContentClick = useCallback(() => {
    if (isMobileViewport() && document.body.classList.contains('sidebar-open')) {
      closeMobileSidebar();
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeMobileSidebar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    closeMobileSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { toggleSidebar, closeMobileSidebar, handleContentClick };
}
