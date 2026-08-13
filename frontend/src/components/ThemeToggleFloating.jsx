import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * Bouton flottant de bascule de thème, façon bulle WhatsApp.
 * Placé une seule fois — idéalement dans le layout racine — il reste visible
 * au-dessus de tout le contenu, sur mobile comme sur desktop.
 */
export default function ThemeToggleFloating() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === 'dark' ? t('enableLight') : t('enableDark')}
      aria-label={theme === 'dark' ? t('enableLight') : t('enableDark')}
      className="fixed bottom-5 right-5 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl ring-1 ring-black/10 transition hover:scale-105 hover:bg-blue-700 active:scale-95"
      style={{ height: '52px', width: '52px' }}
    >
      {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
    </button>
  );
}