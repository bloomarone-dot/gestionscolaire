# Changelog frontend

## Refonte Tailwind SaaS

- Ajout d'un audit frontend documenté dans `AUDIT_FRONTEND.md`.
- Remplacement du shell AdminLTE par un layout SaaS Tailwind responsive.
- Ajout d'un design system Tailwind avec composants UI réutilisables.
- Ajout de pages modernes: dashboard, élèves, enseignants, classes, emploi du temps, présences, notes/bulletins, paiements, rapports et paramètres.
- Ajout de données temporaires réalistes pour afficher les interfaces sans dépendre du backend.
- Suppression des imports runtime Bootstrap/AdminLTE/jQuery.

## Séparation des rôles et connexion backend

- Ajout d'une console `superadmin` dédiée à `/superadmin/dashboard`.
- Blocage du dashboard établissement pour le rôle `superadmin`.
- Redirection automatique selon le rôle après connexion: `superadmin` vers la console plateforme, `admin` vers l'espace établissement.
- Ajout d'un flux superadmin pour créer un établissement via `/tenants/schools`.
- Ajout d'un flux superadmin pour créer l'admin d'établissement via `/auth/accounts`.
- Branchement des pages élèves, enseignants et classes sur les services backend avec fallback demo si les microservices sont indisponibles.
- Ajout d'un formulaire admin établissement pour créer les enseignants via `/personnel/enseignants`.
- Ajout de deux modes de démonstration distincts: admin établissement et superadmin.
- Menus rendus fonctionnels: parents, matières, bulletins, dépenses et utilisateurs ouvrent maintenant des vues métier au lieu de pages d'attente.
- Topbar rendue interactive: recherche par module, notifications déroulantes et menu utilisateur avec accès paramètres/utilisateurs/déconnexion.
- Console superadmin complétée: listes établissements/admins, création admin et paramètres plateforme.

## Opérations métier branchées

- Création opérationnelle des professeurs via `/personnel/enseignants`.
- Création opérationnelle des classes via `/pedagogie/classes`.
- Création opérationnelle des matières spéciales par classe via `/pedagogie/classes/{id}/matieres/special`.
- Inscription opérationnelle des élèves via `/eleves` avec parent/tuteur.
- Saisie groupée des notes via `/evaluations/notes/bulk`.
- Génération, aperçu, publication et export PDF des bulletins via `/bulletins`.
- Ajout d'un espace professeur séparé à `/professor/*` avec consultation classes/élèves, saisie des notes, bulletins et profil.
- Ajout de `scripts/import_school_excel.py` pour lire `Tableaux_Plateforme_Scolaire.xlsx`, générer un rapport JSON et charger les référentiels vers l'API avec un token superadmin.

## Nettoyage pré-déploiement

- Suppression des exports inutilisés dans les anciens composants de navigation.
- Séparation du hook `useAuth` dans `context/useAuth.js` pour supprimer les warnings Fast Refresh.
- Correction des dépendances du hook de chargement dans `NotesEntry`.
- Validation finale avec `npm run build` et `npm run lint` sans erreur ni warning.

## Affectations et années scolaires

- Création professeur enrichie avec affectation immédiate à une matière de classe.
- Création matière enrichie avec association facultative immédiate à un professeur.
- Les matières chargées depuis l'API conservent maintenant leur `classe_id` et `classe_nom`.
- Ajout d'une gestion des années scolaires dans les paramètres: préparation, activation, archivage et passage à l'année suivante.
- Backend `pedagogie-service`: ajout du modèle `AnneeScolaire`, rattachement optionnel des classes à l'année active, endpoints de création/liste/activation/passage d'année.
- Backend `pedagogie-service`: création d'une matière spéciale avec `enseignant_id` optionnel pour affecter un professeur dès la création.

## Prochaines améliorations

- Rebrancher les modules restants: paiements, présences, notes, bulletins et rapports.
- Migrer les modales métier existantes vers le nouveau composant `Modal`.
- Supprimer les anciens composants et fichiers CSS non utilisés après validation fonctionnelle.
- Ajouter des tests de rendu sur les composants UI critiques.
