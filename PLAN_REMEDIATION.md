# PLAN_REMEDIATION.md — Phase 2 : Plan de remédiation

> **Projet :** `gestionscolaire` (BLOOMAR). **Date :** 2026-06-13.
> **Base :** `AUDIT_ECARTS.md` (validé). **Statut :** 📋 *Plan soumis à validation. Aucun code n'est écrit dans ce livrable.*
> **Décision actée :** les items hors cahier (Présences, Emplois du temps, Paiements, Dépenses, Rapports) sont **conservés** mais regroupés sous une rubrique **« Extra »** distincte, hors hiérarchie §8.

---

## 0. Principes d'exécution

- **Incréments testables, un domaine à la fois**, commits atomiques (un message = une correction = un point du cahier).
- Avant toute modif : vérifier les usages existants (ne pas casser le fonctionnel actuel).
- Chaque domaine livré avec : résumé, **règle du cahier satisfaite**, et **comment tester**.
- Tests ajoutés sur les points sensibles : cascade, héritage matières, isolation tenant, bulletins, notifications, auth téléphone.

---

## 1. Ordre de priorité (vue d'ensemble)

| Lot | Domaine | Écart traité | Gravité | Effort |
|---|---|---|---|---|
| **P0-A** | Affichage / Sidebar | Sidebar §8 (hiérarchie + dépliable + rubrique Extra) | Bloquant | M |
| **P0-B** | Classes | Cascade création classe (§4) + classe spéciale (§4.3) | Bloquant | M |
| **P0-C** | Élèves | Cascade + filtrage classes à l'inscription (§6) | Bloquant | M |
| **P1-A** | Référentiel | Garde-fou écriture superadmin (§1) | Majeur | S |
| **P1-B** | Bulletins | Section « Matières complémentaires » dans le PDF (§11.3) | Majeur | M |
| **P1-C** | Profil école | Filtre amont sous-systèmes/types (§14) | Majeur | M |
| **P2-A** | Affichage | Colonnes exactes tableaux §9.1/9.2/9.3 | Mineur | M |
| **P2-B** | Promotions | Suggestion auto classe de destination (§10.2) | Mineur | S |
| **P2-C** | Référentiel | Écran « Référentiel MINESEC » lecture seule (§8) | Mineur | S |
| **P2-D** | Communication | Annonces + event (§8/§12) | Mineur | M |
| **P2-E** | Élèves/Personnel/Notif | Polish (transfert UI, 2e tel parent, config canaux) | Mineur | S→M |

> On livre **P0 → P1 → P2**. P0 lève les 3 bloquants ; P1 ferme les non-conformités majeures ; P2 = complétude/polish.

---

## 2. Détail par lot

### P0-A — Sidebar conforme §8 *(Affichage)*

**Ce qui sera fait :** restructurer la sidebar en rubriques dépliables, ordre exact §8 :
Tableau de bord → **Structure Pédagogique** (Classes, Matières, Référentiel MINESEC) → **Personnel** (Enseignants, Direction/Administration) → **Élèves** (Liste, Inscriptions, Promotions) → **Évaluations** (Saisie des notes, Bulletins) → **Communication** (Annonces, Notifications) → **Paramètres** (Profil école, Utilisateurs & Droits). Puis une rubrique **« Extra »** (Présences, Emplois du temps, Paiements, Dépenses, Rapports).

**Fichiers :** [SaaSLayout.jsx](frontend/src/components/layout/SaaSLayout.jsx) (structure `nav` → groupes + état déplié). Routes inchangées (App.jsx déjà en place).
**Régression :** faible (cosmétique + navigation). Vérifier que toutes les routes existantes restent atteignables.
**Test :** chaque sous-rubrique mène à sa page ; rubriques se déplient/replient ; ordre conforme.

---

### P0-B — Cascade création de classe (§4 / §4.3) *(Classes)*

**Ce qui sera fait :**
1. Ajouter dans [api.js](frontend/src/api/api.js) les helpers référentiel : `fetchSubsystems()`, `fetchTeachingTypes(subsystem)`, `fetchCycles(subsystem, type)`, `fetchLevels(subsystem, type, cycle)`, `fetchLevelSeries(levelCode)`.
2. Réécrire le formulaire de création de classe en **cascade dépendante** (Sous-système → Type → Cycle → Niveau → Série, série sautée si le niveau n'en a pas). **Seul champ libre = nom personnalisé.** Envoyer `subsystem_code/type_code/cycle_code/level_code/series_code` au backend (déjà attendus par `ClasseCreate`).
3. Bascule **« Classe spéciale (hors référentiel MINESEC) »** : remplace Niveau/Série par deux champs texte libres, met `is_special=true`, aucune matière pré-remplie. Étiquette « Spéciale » déjà gérée.
4. Supprimer le tableau `levelOptions` en dur et le champ texte libre « Série ou spécialité ».

**Fichiers :** [SchoolOperations.jsx](frontend/src/pages/modern/SchoolOperations.jsx) (OperationalClassesPage), [api.js](frontend/src/api/api.js).
**Régression :** moyenne — le payload de `createClasse` change. Vérifier que l'héritage des matières se déclenche toujours (backend OK).
**Test :** créer une Tle D → matières héritées ; créer une 6e (pas de série, étape sautée) ; créer une classe spéciale → aucune matière, étiquette présente.
**Règle satisfaite :** Règle 2, Règle 4, §4.1, §4.3.

> **Option à trancher (B1)** — état de la cascade : (a) **hook réutilisable** `useReferentielCascade()` partagé classe+élève *(recommandé : évite la duplication P0-C)* ; (b) logique locale dupliquée dans chaque formulaire.

---

### P0-C — Cascade + filtrage classes à l'inscription élève (§6) *(Élèves)*

**Ce qui sera fait :**
1. Même cascade que P0-B dans le formulaire élève (réutilise le hook si option B1.a retenue).
2. **Étape Classe filtrée** : n'afficher que les classes de l'école correspondant **exactement** au Sous-système + Type + Niveau + Série choisis (filtrage via `GET /pedagogie/classes?subsystem=&type=&level=&series=` — déjà supporté).
3. Compléter le bloc parent (2e numéro + adresse optionnels — §6.1).

**Fichiers :** [SchoolOperations.jsx](frontend/src/pages/modern/SchoolOperations.jsx) (OperationalStudentsPage), [api.js](frontend/src/api/api.js) (`fetchClasses` avec filtres).
**Régression :** moyenne — la liste des classes devient filtrée. S'assurer qu'un message clair s'affiche si aucune classe ne correspond.
**Test :** sélectionner Francophone/Général/Terminale/D → seules les Tle D apparaissent ; inscrire → l'élève hérite des matières de la classe.
**Règle satisfaite :** Règle 4, §6.1, §6.2.

---

### P1-A — Garde-fou écriture du référentiel (§1) *(Référentiel)*

**Ce qui sera fait :** protéger `POST /referentiel/subjects` et `/referentiel/eligibility` par `require_roles("superadmin")` (le `tenant_id` du superadmin est NULL). Vérifier en parallèle que la **gateway** n'expose pas ces routes en écriture aux rôles école.
**Fichiers :** [referentiel main.py](services/referentiel-service/app/main.py), éventuellement [api-gateway main.py](services/api-gateway/app/main.py).
**Régression :** faible. Test : un compte `admin` reçoit 403 ; un `superadmin` réussit.
**Règle satisfaite :** Règle 1, §1.

---

### P1-B — Section « Matières complémentaires » au PDF (§11.3) *(Bulletins)*

**Ce qui sera fait :** rendre dans [pdf.py](services/bulletins-service/app/pdf.py) une **section séparée** « Matières complémentaires de l'établissement » / « Complementary subjects » à partir des `special_subjects` déjà calculés par [compute.py](services/bulletins-service/app/compute.py), sous le tableau principal, sans les mélanger aux matières officielles ni aux statistiques.
**Fichiers :** [pdf.py](services/bulletins-service/app/pdf.py), libellé dans [labels.py](services/bulletins-service/app/labels.py).
**Régression :** faible (additif). Test : classe avec une matière spéciale → apparaît dans la section dédiée, pas dans les groupes officiels ; rendu FR et EN. Lancer les tests bulletins.
**Règle satisfaite :** Règle 7, §11.3.

---

### P1-C — Profil école = filtre amont (§14) *(Profil école)*

**Ce qui sera fait :** exposer/909consommer `school_subsystems` + `school_teaching_types` : la cascade (P0-B/P0-C) ne propose que les sous-systèmes/types **activés** pour l'école. Écran Paramètres › Profil école pour cocher les sous-systèmes/types actifs.
**Fichiers :** [tenant main.py/schemas.py](services/tenant-service/app/main.py) (endpoints profil), [SchoolSettings.jsx](frontend/src/pages/modern/SchoolSettings.jsx), [api.js](frontend/src/api/api.js).
**Régression :** moyenne — la cascade dépend désormais du profil. Prévoir un défaut « tout actif » si non configuré, pour ne rien bloquer.
**Règle satisfaite :** Règle 14, §14, §8 (remarque).

---

### P2 — Complétude & polish

- **P2-A (Affichage §9)** : compléter colonnes exactes — Classes (badges Sous-système/Type, Série, effectif actuel/max, **nom** prof principal, nb matières, statut) ; Enseignants (matières enseignées, classes assignées, statut) ; Élèves (classe cliquable, statut). Fichiers : [SchoolOperations.jsx](frontend/src/pages/modern/SchoolOperations.jsx). Peut nécessiter un agrégat backend (classes assignées d'un enseignant — endpoint déjà dispo via `?enseignant=`).
- **P2-B (Promotions §10.2)** : proposer automatiquement la classe de destination « logique » (niveau suivant selon référentiel) pré-sélectionnée, modifiable. Fichiers : [PromotionsPage.jsx](frontend/src/pages/modern/PromotionsPage.jsx), helper de mapping niveau→niveau suivant (référentiel `order`).
- **P2-C (Référentiel MINESEC lecture seule §8)** : écran read-only de l'arborescence (consomme `GET /referentiel/tree`). Nouvelle page + route + sous-rubrique.
- **P2-D (Annonces §8/§12)** : feature annonces (création + diffusion) + event `AnnouncementPublished` dans le mapping notifications + historique. Backend léger (table annonces tenant) + UI.
- **P2-E (polish divers)** : UI transfert élève (§6.3), 2e numéro/adresse parent, écran de configuration des canaux de notification (§12.2).

---

## 3. Décisions à trancher avant de coder

| # | Décision | Options | Reco |
|---|---|---|---|
| **B1** | État de la cascade | (a) hook partagé `useReferentielCascade` ; (b) dupliqué par formulaire | **(a)** |
| **B2** | Annonces (§8/§12) | (a) inclure en P2-D ; (b) hors scope pour l'instant | à trancher |
| **B3** | Écran Référentiel MINESEC lecture seule (§8) | (a) inclure en P2-C ; (b) différer | à trancher |
| **B4** | Profil école (P1-C) défaut si non configuré | (a) **tout actif** (rien bloqué) ; (b) bloquer tant que non configuré | **(a)** |

---

## ⛔ STOP — Validation attendue

Merci de **valider ce plan** (et de trancher B1–B4). Dès ton feu vert, j'attaque la Phase 3 **lot par lot**, en commençant par **P0-A → P0-B → P0-C**, avec après chaque lot : résumé, règle satisfaite, et procédure de test.
