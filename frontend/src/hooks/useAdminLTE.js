import { useEffect } from 'react';

export default function useAdminLTE(deps = []) {
  useEffect(() => {
    document.body.classList.add(
      'hold-transition',
      'sidebar-mini',
      'layout-fixed',
      'layout-navbar-fixed',
    );
    return () => {
      document.body.classList.remove(
        'hold-transition',
        'sidebar-mini',
        'layout-fixed',
        'layout-navbar-fixed',
      );
    };
  }, []);

  useEffect(() => {
    const $ = window.$;
    if (!$ || !$.fn?.Treeview) return;

    $('[data-widget="treeview"]').each(function initTreeview() {
      const plugin = $.fn.Treeview;
      if (!$.data(this, plugin.dataKey)) {
        plugin.call($(this));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
