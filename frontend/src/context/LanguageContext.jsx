import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Dictionnaire central de traductions.
 * Ajoute ici les clés au fur et à mesure que tu convertis chaque page :
 * remplace le texte en dur `"Mon profil"` par `t('myProfile')` dans le JSX,
 * et ajoute la clé correspondante en fr ET en en ci-dessous.
 */
const STRINGS = {
  fr: {
    // Header / recherche
    searchPlaceholder: 'Recherche globale : élève, classe, paiement...',
    fullscreenEnter: 'Passer en plein écran',
    fullscreenExit: 'Quitter le plein écran',
    enableDark: 'Activer le mode sombre',
    enableLight: 'Activer le mode clair',
    switchToEn: 'Passer en anglais',
    switchToFr: 'Passer en français',

    // Notifications
    notifications: 'Notifications',
    notif1: 'Paiements en attente',
    notif2: 'Conseil de classe vendredi',
    notif3: '3 absences à justifier',

    // Menu profil
    myProfile: 'Mon profil',
    establishmentSettings: 'Paramètres établissement',
    users: 'Utilisateurs',
    logout: 'Déconnexion',
    collapse: 'Réduire',
    administrator: 'Administrateur',

    // Page Mon profil
    backToDashboard: 'Retour au tableau de bord',
    profileTitle: 'Mon profil',
    profileSubtitle: 'Gère tes informations personnelles et tes préférences',
    changeAvatar: 'Changer la photo',
    tabInfo: 'Informations',
    tabSecurity: 'Sécurité',
    tabPreferences: 'Préférences',
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'Adresse email',
    phone: 'Téléphone',
    username: "Nom d'utilisateur",
    role: 'Rôle',
    memberSince: 'Membre depuis',
    saveChanges: 'Enregistrer les modifications',
    saving: 'Enregistrement...',
    savedConfirmation: 'Modifications enregistrées',
    cancel: 'Annuler',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le nouveau mot de passe',
    passwordHint: '8 caractères minimum, avec au moins un chiffre',
    updatePassword: 'Mettre à jour le mot de passe',
    languagePrefTitle: 'Langue de l\'interface',
    languagePrefDesc: 'Choisis la langue utilisée dans l\'application',
    themePrefTitle: 'Apparence',
    themePrefDesc: 'Choisis entre le thème clair et le thème sombre',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    backendPendingNotice: 'La sauvegarde sera connectée au serveur prochainement — pour l\'instant cet écran est prêt côté visuel.',
  },
  en: {
    searchPlaceholder: 'Global search: student, class, payment...',
    fullscreenEnter: 'Enter fullscreen',
    fullscreenExit: 'Exit fullscreen',
    enableDark: 'Enable dark mode',
    enableLight: 'Enable light mode',
    switchToEn: 'Switch to English',
    switchToFr: 'Switch to French',

    notifications: 'Notifications',
    notif1: 'Pending payments',
    notif2: 'Class council on Friday',
    notif3: '3 absences to justify',

    myProfile: 'My profile',
    establishmentSettings: 'Institution settings',
    users: 'Users',
    logout: 'Log out',
    collapse: 'Collapse',
    administrator: 'Administrator',

    // Profile page
    backToDashboard: 'Back to dashboard',
    profileTitle: 'My profile',
    profileSubtitle: 'Manage your personal information and preferences',
    changeAvatar: 'Change photo',
    tabInfo: 'Information',
    tabSecurity: 'Security',
    tabPreferences: 'Preferences',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email address',
    phone: 'Phone',
    username: 'Username',
    role: 'Role',
    memberSince: 'Member since',
    saveChanges: 'Save changes',
    saving: 'Saving...',
    savedConfirmation: 'Changes saved',
    cancel: 'Cancel',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    passwordHint: 'At least 8 characters, including one number',
    updatePassword: 'Update password',
    languagePrefTitle: 'Interface language',
    languagePrefDesc: 'Choose the language used across the app',
    themePrefTitle: 'Appearance',
    themePrefDesc: 'Choose between light and dark theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    backendPendingNotice: 'Saving will be wired to the server soon — for now this screen is ready on the visual side.',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => (
    typeof window !== 'undefined' ? (localStorage.getItem('lang') || 'fr') : 'fr'
  ));

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem('lang', lang);
  }, [lang]);

  const setLang = useCallback((value) => setLangState(value), []);
  const toggleLang = useCallback(() => setLangState((v) => (v === 'fr' ? 'en' : 'fr')), []);

  // t('cle') -> texte traduit. Si la clé n'existe pas encore, retombe sur le
  // français puis, en dernier recours, affiche la clé elle-même (pratique en
  // dev pour repérer les clés manquantes).
  const t = useCallback((key) => {
    const dict = STRINGS[lang] || STRINGS.fr;
    return dict[key] ?? STRINGS.fr[key] ?? key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage doit être utilisé à l\'intérieur d\'un <LanguageProvider>');
  }
  return ctx;
}