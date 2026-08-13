import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Feuille de style globale pour le mode sombre.
// Tailwind ne génère que les classes réellement utilisées : plutôt que de
// retoucher `dark:` sur chaque page une par une, on surcharge ici les
// classes slate/white les plus courantes dès que `.dark` est présent sur
// <html>. Étends cette liste si une page garde un fond blanc non couvert.
const DARK_MODE_CSS = `
  .dark { color-scheme: dark; }
  .dark body { background-color: #0b1220; }

  .dark .bg-slate-50 { background-color: #0b1220 !important; }
  .dark .bg-white { background-color: #111a2e !important; }
  .dark .bg-white\\/90 { background-color: rgba(17,26,46,0.9) !important; }
  .dark .bg-slate-100 { background-color: #1c2942 !important; }

  .dark .text-slate-950 { color: #f1f5f9 !important; }
  .dark .text-slate-900 { color: #f1f5f9 !important; }
  .dark .text-slate-800 { color: #e2e8f0 !important; }
  .dark .text-slate-700 { color: #cbd5e1 !important; }
  .dark .text-slate-600 { color: #94a3b8 !important; }
  .dark .text-slate-500 { color: #7c8aa5 !important; }
  .dark .text-slate-400 { color: #64748b !important; }

  .dark .border-slate-200 { border-color: #253352 !important; }
  .dark .border-slate-100 { border-color: #253352 !important; }
  .dark .ring-slate-200 { --tw-ring-color: #253352 !important; }

  .dark .hover\\:bg-slate-100:hover { background-color: #1c2942 !important; }
  .dark .hover\\:bg-slate-50:hover { background-color: #182338 !important; }
  .dark .hover\\:text-slate-900:hover { color: #f1f5f9 !important; }
  .dark .hover\\:text-slate-950:hover { color: #f8fafc !important; }
  .dark .hover\\:text-slate-700:hover { color: #cbd5e1 !important; }

  .dark .bg-blue-50 { background-color: #16233f !important; }
  .dark .text-blue-700 { color: #60a5fa !important; }

  .dark .bg-rose-50 { background-color: #2a1420 !important; }
  .dark .hover\\:bg-rose-50:hover { background-color: #2a1420 !important; }
  .dark .text-rose-600 { color: #fb7185 !important; }

  .dark .placeholder\\:text-slate-400::placeholder { color: #566078 !important; }

  .dark .shadow-lg, .dark .shadow-xl { box-shadow: 0 10px 30px rgba(0,0,0,0.45) !important; }
`;

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => (
    typeof window !== 'undefined' ? (localStorage.getItem('theme') || 'light') : 'light'
  ));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => setThemeState((v) => (v === 'dark' ? 'light' : 'dark')), []);
  const setTheme = useCallback((value) => setThemeState(value), []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {/* Injecté une seule fois, au niveau racine, donc actif sur toutes
          les pages (login compris), pas seulement celles dans SaaSLayout. */}
      <style>{DARK_MODE_CSS}</style>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme doit être utilisé à l\'intérieur d\'un <ThemeProvider>');
  }
  return ctx;
}