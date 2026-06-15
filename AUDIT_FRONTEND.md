# Audit frontend

## Synthèse

Le frontend React/Vite contient une base fonctionnelle riche, mais l'interface est fragmentée entre plusieurs systèmes visuels: CSS global historique, composants custom, Bootstrap/AdminLTE et Tailwind CSS. Cette coexistence crée des incohérences de rendu, des dépendances inutiles et rend les écrans difficiles à maintenir.

## Structure observée

- `frontend/src/App.jsx`: routes principales, redirections par rôle, mélange de pages anciennes et dashboards par rôle.
- `frontend/src/layouts/AdminLTELayout.jsx`: layout applicatif basé sur les conventions AdminLTE.
- `frontend/src/adminlte/setup.js`: charge jQuery, Bootstrap JS/CSS et AdminLTE JS/CSS.
- `frontend/src/styles/*`: nombreux fichiers CSS par fonctionnalité, avec styles redondants pour cartes, formulaires, tables, modales et layouts.
- `frontend/src/components/*`: composants métier et composants de layout mélangés au même niveau.
- `frontend/src/pages/*`: pages métier, dashboards par rôle et pages superadmin.
- `frontend/src/api/api.js`: couche API centralisée déjà utile, à conserver.

## Problèmes identifiés

### Dépendances inutiles ou incompatibles avec l'objectif Tailwind

- `admin-lte`: à retirer.
- `bootstrap`: à retirer.
- `jquery`: à retirer.
- `popper.js`: à retirer.
- `@fortawesome/fontawesome-free`: à retirer si les icônes passent toutes sur `lucide-react`.

Fichiers concernés:

- `frontend/package.json`
- `frontend/src/adminlte/setup.js`
- `frontend/src/main.jsx`
- `frontend/src/styles/adminlte-custom.css`
- `frontend/src/layouts/AdminLTELayout.jsx`
- `frontend/src/hooks/useAdminLTE.js`

### Incohérences visuelles

- Plusieurs types de cartes: `.card`, `.sa-panel`, `.prof-card`, `.classe-card`, `.matiere-card`, `.dashboard-hero`.
- Plusieurs styles de badges: `.badge`, `.sa-badge`, badges Bootstrap, badges custom.
- Plusieurs systèmes de tables: tables globales, `.sa-table`, `.eleves-table`, `.admin-notes-table`, `.bulletin-matieres-table`.
- Modales répétées avec styles spécifiques plutôt qu'un composant commun.

### Problèmes responsive et UX

- Sidebar et topbar liées à AdminLTE et classes globales du body.
- Certains tableaux utilisent `text-nowrap`/styles custom sans vraie stratégie mobile.
- Beaucoup de pages ont des actions primaires différentes visuellement.
- Les modules à venir ne sont pas structurés dans une navigation SaaS unifiée.

### Lisibilité et séparation

- Les composants UI réutilisables ne sont pas isolés dans `components/ui`.
- Les layouts sont couplés à AdminLTE.
- Les pages mélangent logique de chargement, rendu, formulaire et tableau.
- Des CSS anciens restent chargés même quand les composants ne sont pas utilisés.

## Composants à conserver

- `frontend/src/api/api.js`: point d'intégration API.
- `frontend/src/context/AuthContext.jsx`: gestion session actuelle.
- Hooks utilitaires métier: `useSchoolBranding`, `draftStorage`, `dates`, `notes`, `sections`.
- Composants métier pouvant être réintégrés progressivement après migration Tailwind: `NotesEntry`, `BulletinModule`, modales de création/édition.

## Composants à supprimer ou refactoriser

- Supprimer/ignorer: `adminlte/setup.js`, `AdminLTELayout.jsx`, `useAdminLTE.js`, `adminlte-custom.css`.
- Refactoriser: navigations admin/professeur/superadmin vers une sidebar unique Tailwind.
- Refactoriser: listes `ElevesList`, `ProfesseursList`, `ClassesList`, `MatieresList` vers `DataTable`.
- Refactoriser: modales métier vers `Modal` + formulaires Tailwind.

## Priorités de correction

1. Retirer les imports AdminLTE/Bootstrap/jQuery et les dépendances associées.
2. Créer un design system Tailwind unique.
3. Remplacer le layout par un shell SaaS responsive.
4. Recréer les pages principales en composants Tailwind cohérents.
5. Rebrancher progressivement les écrans métier complexes sur les services API existants.
6. Supprimer les anciens fichiers CSS une fois tous les composants migrés.

## Plan de refonte appliqué

- Mise en place de `components/ui` pour les primitives.
- Mise en place de `components/layout/SaaSLayout.jsx`.
- Mise en place de `components/layout/SuperAdminLayout.jsx` pour isoler la console plateforme.
- Création de pages modernes par module scolaire.
- Utilisation de données temporaires réalistes dans `data/mockSchool.js`.
- Suppression des imports AdminLTE/Bootstrap de l'application active.

## Ajustement rôle superadmin

Problème corrigé après validation visuelle: le rôle `superadmin` était redirigé vers le dashboard d'un établissement. Ce dashboard correspond à l'admin d'établissement, pas au superadmin.

Corrections appliquées:

- `frontend/src/App.jsx`: redirections et protections par rôle.
- `frontend/src/components/layout/SuperAdminLayout.jsx`: navigation plateforme séparée.
- `frontend/src/pages/modern/SuperAdminConsole.jsx`: création d'établissement et création de l'admin.
- `frontend/src/context/AuthContext.jsx`: modes de démonstration séparés `admin` et `superadmin`.
- `frontend/src/pages/LoginPage.jsx`: boutons de test distincts.

Flux cible:

- Superadmin: crée un établissement, puis crée l'admin rattaché à cet établissement.
- Admin d'établissement: accède au dashboard scolaire et crée les enseignants.
- Enseignant: reste orienté vers ses fonctions pédagogiques.
