# AUDIT_ECARTS.md — Phase 1 : Audit & Analyse d'écart

> **Projet :** EduGestion / gestionscolaire — SaaS multi-tenant, établissements secondaires (Cameroun).  
> **Date :** 2026-06-15  
> **Périmètre audité :** code **effectivement présent** dans le dépôt, confronté au cahier des charges fonctionnel (sections 1→13), aux **15 règles métier de référence**, et au **module MVP notes & bulletins** (note de cadrage jointe).  
> **Statut :** 🔎 *Audit seul — aucune correction appliquée dans ce livrable.*

> ⚠️ Un audit antérieur (2026-06-13) signalait des écarts bloquants côté frontend (cascade absente, sidebar plate). **Depuis, une partie significative a été corrigée.** Le présent document reflète l'état **actuel** du code au 15/06/2026.

---

## 1. État des lieux du code

### 1.1 Architecture réelle

Stack unique **microservices** câblée dans `docker-compose.yml`.

```
gestionscolaire-main/
├── services/                    # FastAPI + PostgreSQL + RabbitMQ
│   ├── api-gateway/             # JWT, injection X-Tenant-Id / X-Role / X-User-Id
│   ├── auth-service/            # Login téléphone + mot de passe, comptes
│   ├── tenant-service/          # Écoles, profil pédagogique (§14), canaux notif
│   ├── referentiel-service/     # Référentiel MINESEC national (seed, cascade)
│   ├── pedagogie-service/       # Classes, matières de classe, héritage, spéciales
│   ├── personnel-service/       # Enseignants + direction
│   ├── eleves-service/          # Élèves, parents, transferts, promotions
│   ├── evaluations-service/     # Saisie notes bulk, fenêtres de saisie
│   ├── bulletins-service/       # Calcul moyennes/rangs, PDF FR/EN
│   └── notifications-service/   # Worker RabbitMQ, historique, annonces
├── libs/common/                 # JWT, tenant, events, db (RLS prévu), http_client
├── frontend/                    # React 19 + Vite + Tailwind — pages/modern/*
└── infra/postgres/init/         # 9 bases logiques (1 par service)
```

**Frontend :** `frontend/src/App.jsx` → `pages/modern/*` + layouts `SaaSLayout`, `SuperAdminLayout`, `ProfessorLayout`. *(Couche legacy supprimée le 2026-06-15.)*

**Multi-tenant :** isolation par `tenant_id` en couche applicative dans chaque service. RLS PostgreSQL préparée dans `libs/common/common/db.py` mais **non activée** sur les services (Phase 5 prévue).

**Rôles :** `superadmin` (tenant_id NULL), `admin`, `direction`, `enseignant`, `parent`.

### 1.2 Ce qui est déjà implémenté et fonctionne

| Domaine | État | Fichiers clés |
|---------|------|---------------|
| Référentiel MINESEC (seed, cascade API) | ✅ Opérationnel | `services/referentiel-service/app/seed_data.py`, `main.py` |
| Auth téléphone + mot de passe | ✅ Microservices | `services/auth-service/app/main.py`, `frontend/src/pages/LoginPage.jsx` |
| Création classe en cascade + héritage matières | ✅ Backend + frontend | `pedagogie-service/app/crud.py`, `SchoolOperations.jsx` (ClasseCreatePage) |
| Classe spéciale (toggle UI) | ✅ | `SchoolOperations.jsx` L360-431 |
| Matières spéciales + confirmation décochage obligatoire | ✅ | `pedagogie-service/app/crud.py`, `OperationalSubjectsPage` |
| Inscription élève en cascade + filtre classes | ✅ | `EleveCreatePage`, `useReferentielCascade.js` |
| Héritage matières élève (dérivé de la classe) | ✅ | `eleves-service/app/main.py` GET `/eleves/{id}/matieres` |
| Personnel (tél. obligatoire, direction 2 tél.) | ✅ | `personnel-service`, `PersonnelCreatePage` |
| Sidebar hiérarchique §8 (rubriques dépliables) | ✅ | `SaaSLayout.jsx` L14-64 |
| Tableaux Classes / Enseignants / Élèves (DataTable) | ✅ | `SchoolOperations.jsx` |
| Saisie collective des notes (grille classe/matière/séquence) | ✅ | `GradesWorkspace` dans `SchoolOperations.jsx` |
| Calcul T3 = moy(S5, S6), points, moyenne générale, rangs | ✅ | `bulletins-service/app/compute.py` |
| Bulletin trimestriel PDF FR/EN + section spéciales | ✅ | `bulletins-service/app/pdf.py` L57-59, `_special_subjects` |
| Promotions / Passages + suggestion destination | ✅ | `PromotionsPage.jsx`, `eleves-service` POST `/promotions/apply` |
| Notifications événements + historique + annonces | ✅ (stubs envoi) | `notifications-service/app/mapping.py`, `AnnouncementsPage.jsx` |
| Profil école filtre cascade | ✅ | `useReferentielCascade.js` L25-54, `SchoolSettings.jsx` |
| Référentiel lecture seule (école) + admin plateforme | ✅ | `ReferentielPage.jsx`, `ReferentielAdminPage.jsx` |
| Tests automatisés sensibles | ✅ Partiel | `services/*/tests/test_*.py` (9 fichiers) |

---

## 2. Tableau d'écarts — livrable central

**Légende Verdict :** ✅ conforme · ⚠️ partiel · ❌ absent · 🔴 présent mais mal fait / non conforme  
**Gravité :** Bloquant / Majeur / Mineur · **Effort :** S (<1j) · M (1–3j) · L (>3j)

### 2.1 Règles métier de référence (15 règles)

| Réf. | Exigence | État dans l'existant | Verdict | Gravité | Effort |
|------|----------|----------------------|---------|---------|--------|
| R1 | Référentiel MINESEC partagé, lecture seule écoles, modifiable admin plateforme, seed | Tables + seed (`seed_data.py`) ; lecture via `/referentiel/*` ; écriture protégée `require_roles("superadmin")` (`referentiel-service/app/main.py` L157+) ; UI superadmin `ReferentielAdminPage.jsx` ; UI école `ReferentielPage.jsx` | ✅ | — | — |
| R2 | Zéro saisie noms officiels — cascade, seul nom personnalisé libre | `CascadeFields` + `useReferentielCascade` branchés sur API référentiel ; `ClasseCreatePage` et `EleveCreatePage` conformes | ✅ | — | — |
| R3 | Multi-tenant strict (matière spéciale École A invisible École B) | `tenant_id` filtré dans tous les services ; tests isolation `test_pedagogie.py` ; RLS Postgres **non activée** | ⚠️ | Majeur | M |
| R4 | Cascade classe ET élève (Sous-syst.→Type→Cycle→Niveau→Série) | Implémentée frontend + backend ; série sautée si niveau sans série (`useReferentielCascade.js` L104-105) | ✅ | — | — |
| R5 | Héritage auto matières à création classe (cochées, coeff défaut) | `crud.create_class` + `fetch_official_subjects` ; test `test_standard_class_inherits_subjects` | ✅ | — | — |
| R6 | Décocher matière obligatoire → confirmation | Backend `ConfirmationRequired` (409) ; frontend `window.confirm` + `confirm: true` ; **mais** `is_obligatoire` quasi toujours `False` en seed (voir §5.2) | ⚠️ | Majeur | S |
| R7 | Matières spéciales étiquetées, section bulletin séparée | `source=SPECIALE` ; PDF section « Matières complémentaires » (`pdf.py` L57-59) ; exclues de la moyenne générale (`compute.py` L55-56) | ✅ | — | — |
| R8 | Classes spéciales : texte libre, aucune matière pré-remplie, étiquette partout | Backend + toggle UI « Classe spéciale » ; badge « Spéciale » dans tableau classes | ✅ | — | — |
| R9 | Auth personnel = téléphone + mot de passe ; email jamais obligatoire | Microservices : `Account.phone` unique ; `LoginPage.jsx` téléphone uniquement ; formulaires email facultatif | ✅ | — | — |
| R10 | Enseignant : tél. principal obligatoire, email facultatif | `auth-service` + `PersonnelCreatePage` | ✅ | — | — |
| R11 | Direction : 2 téléphones obligatoires, email facultatif | Validé backend (`auth main.py`) + frontend (`phone2` required si non-enseignant) | ✅ | — | — |
| R12 | Parent : téléphone obligatoire, email facultatif | Modèle `Parent.phone` NOT NULL ; formulaire élève : parent optionnel (bloc envoyé seulement si nom+phone) — **pas de validation « parent obligatoire à l'inscription »** | ⚠️ | Mineur | S |
| R13 | Sidebar ordre exact §8, rubriques dépliables | `SaaSLayout.jsx` : ordre conforme + groupes dépliables ; rubrique **Extra** hors cahier (Présences, Paiements…) conservée volontairement | ⚠️ | Mineur | S |
| R14 | Profil école = filtre amont (sous-systèmes/types actifs) | `useReferentielCascade` filtre par `profile.subsystems` / `teaching_types` ; configurable dans `SchoolSettings.jsx` | ✅ | — | — |
| R15 | Promotions : classe destination logique, statuts, ré-inscription + matières héritées | `PromotionsPage` + `NEXT_LEVEL` ; `apply_promotion` met à jour `classe_id` ; matières héritées par dérivation (pas de copie) | ✅ | — | — |

### 2.2 Cahier des charges — sections 1 à 13

| Réf. | Exigence | État dans l'existant | Verdict | Gravité | Effort |
|------|----------|----------------------|---------|---------|--------|
| §1 / §2 | Référentiel national tables + seed tableaux A–D, matières 3.2→3.6 | Seed présent ; lacunes documentées en tête de `seed_data.py` (séries tech sans matières, anglophone 6th form, matières obligatoires) | ⚠️ | Majeur | M |
| §1 | Domaines de matières (§3.1) | Volontairement non intégrés (décision client) ; `groupe` utilisé à la place | ✅ (dérogation) | — | — |
| §4 | Création classe cascade, nom personnalisé seul champ libre | Conforme (`ClasseCreatePage`) | ✅ | — | — |
| §4.3 | Classe spéciale | Conforme (toggle + backend `is_special`) | ✅ | — | — |
| §5.1 | Écran matières de la classe en tableau | `OperationalSubjectsPage` via `DataTable` | ✅ | — | — |
| §5.2 | Confirmation décochage matière obligatoire | Mécanisme OK ; **données** `is_obligatoire=False` par défaut en seed → confirmation rarement déclenchée en conditions réelles | ⚠️ | Majeur | S |
| §5.3 | Matières spéciales propres à l'école | Conforme | ✅ | — | — |
| §6 | Création élève cascade + filtre classes | Conforme (`EleveCreatePage` L531-543) | ✅ | — | — |
| §6.1 | Matricule auto modifiable | Généré si absent (`eleves-service/app/schemas.py`) | ✅ | — | — |
| §6.2 | Élève hérite matières activées de sa classe | GET `/eleves/{id}/matieres` dérive de la classe | ✅ | — | — |
| §6.3 | Transferts même niveau | Backend `POST /eleves/{id}/transfer` ; UI bouton transfert inline dans tableau élèves | ✅ | — | — |
| §7.1–7.3 | Formulaires personnel + login téléphone | Conforme (stack microservices) | ✅ | — | — |
| §8 | Sidebar hiérarchique exacte | Conforme sauf rubrique **Extra** et liens query (`?fonction=`, `?tab=inscription`) **non consommés** par les pages (`OperationalTeachersPage`, `OperationalStudentsPage` n'utilisent pas `useSearchParams`) | ⚠️ | Mineur | S |
| §8 | Référentiel MINESEC lecture seule (école) | `ReferentielPage.jsx` routée `/app/referentiel` | ✅ | — | — |
| §8 / §12 | Communication › Annonces | `AnnouncementsPage.jsx` + `POST /notifications/announce` | ✅ | — | — |
| §9 (général) | Jamais de cartes pour Classes/Enseignants/Élèves | `DataTable` (`<table>`) sur toutes les pages opérationnelles | ✅ | — | — |
| §9 | Recherche + filtres en haut des tableaux | `DataTable` accepte prop `filters` (`ui/index.jsx` L89) mais **aucune page opérationnelle ne fournit de barre recherche/filtre** | ❌ | Majeur | M |
| §9.1 | Colonnes exactes tableau Classes | Présentes : Sous-système, Type, Niveau, Série, Effectif actuel/max, Prof. principal (select), Nb matières, Statut. **Manque** : nom du prof principal en lecture (select inline seulement) | ⚠️ | Mineur | S |
| §9.2 | Colonnes exactes tableau Enseignants | Matières enseignées + Classes assignées agrégées depuis matières (`OperationalTeachersPage` L190-206) ; pas de filtre Enseignants/Direction via sidebar | ⚠️ | Mineur | S |
| §9.3 | Colonnes exactes tableau Élèves | Matricule, Nom, Classe, Sexe, Contact parent, Statut ; classe **lien vers `/app/classes`** (pas la fiche classe) ; statut toujours badge « Inscrit » | ⚠️ | Mineur | S |
| §10 | Promotions/Passages fonctionnel | Conforme avec suggestion auto `NEXT_LEVEL` | ✅ | — | — |
| §11.1–11.2 | Bulletin : matières activées, moyennes, rangs, moyenne classe, FR/EN, signatures | Moteur + PDF conformes ; langue dérivée du sous-système | ✅ | — | — |
| §11.3 | Section « Matières complémentaires de l'établissement » | Rendue dans PDF (`pdf.py` `_special_subjects`) | ✅ | — | — |
| §12 | Notifications déclencheurs/canaux, jamais bloqué par email | `mapping.py` couvre 6 événements ; EMAIL seulement si adresse connue ; **providers SMS/WhatsApp/Email = stubs** (`delivery.py` L17-20) | ⚠️ | Majeur | L |
| §12.2 | Config canaux par école + historisation | Modèle `NotificationChannel` + `NotificationsPage` historique ; config dans `SchoolSettings.jsx` | ✅ | — | — |
| §13 (checklist) | 15 points de conformité fin de parcours | Voir §2.4 ci-dessous — **11/15 ✅**, 4 ⚠️/❌ | ⚠️ | — | — |

### 2.3 Module MVP — Notes & bulletins (note de cadrage jointe)

| Réf. MVP | Exigence | État dans l'existant | Verdict | Gravité | Effort |
|----------|----------|----------------------|---------|---------|--------|
| MVP §2 | Modèle Année→Trimestres→Séquences→Notes→Moyennes→Classement→Bulletin | Notes par `trimestre` + `type_evaluation` (sequence_1…6) ; calcul en aval dans bulletins-service | ✅ | — | — |
| MVP §3.1–3.4 | Matières avec coefficient (pas saisi à la notation) | Coefficient sur `ClasseMatiere` / référentiel ; modèle `Note` **sans** coefficient (`evaluations-service/app/models.py` L3-5) | ✅ | — | — |
| MVP §5 | Enseignants existent pour bulletins (nom sur matière) | Affectation `enseignant_id` sur matière de classe ; porté jusqu'au PDF | ✅ | — | — |
| MVP §6 | Élève : matricule, nom, prénom, sexe, classe, année | Conforme ; année scolaire via `AnneeScolaire` (pedagogie-service) | ✅ | — | — |
| MVP §7 | Saisie collective (grille classe/matière/séquence) | `GradesWorkspace` : sélection + grille élève/note + `POST /evaluations/notes/bulk` | ✅ | — | — |
| MVP §8 | T3 = (S5 + S6) / 2 par matière | `compute.py` : `seq_types_for(scope="trimestre", trimestre=3)` → seq 5 & 6, moyenne arithmétique | ✅ | — | — |
| MVP §9–10 | Points = moyenne × coef ; moyenne générale pondérée | Conforme (`compute.py` L83-101) | ✅ | — | — |
| MVP §11 | Rang matière + rang général, recalcul auto | `_ranks()` avec ex æquo ; recalcul à chaque appel (pas de cache persistant) | ✅ | — | — |
| MVP §12 | Bulletin T3 : S5, S6, moy T3, points, rang, signatures | PDF trimestriel avec 2 colonnes séquences ; signatures prof principal / censeur / principal | ✅ | — | — |
| MVP §13 | Bulletin annuel : Moy T1, T2, T3, Moy annuelle par matière | Backend : `scope=annual` agrège **6 séquences** en une moyenne (`test_annual_six_sequences`), **pas** moyennes trimestrielles T1/T2/T3 comme demandé MVP | 🔴 | **Bloquant** | M |
| MVP §13 | Bulletin annuel : Moyenne générale annuelle, rang annuel, décision passage | Calcul annuel existe mais logique différente ; **aucune UI** pour générer/exporter bulletin annuel (`BulletinsWorkspace` : trimestres 1–3 seulement, pas de `scope=annual`) | 🔴 | **Bloquant** | M |
| MVP §14 | Appréciations paramétrables (18–20 Excellent, etc.) | Barème **hardcodé** codes officiels Cameroun (`labels.py` `appreciation()`) — TB/B/AB/Passable/Insuffisant (FR) ou EXCELLENT/A/IPA/CNA (EN) ; **non paramétrable** par l'administration | ⚠️ | Majeur | M |
| MVP §15 | Export PDF bulletins T3 et annuel | PDF T3 via `exportEleveBulletinPdf` ; PDF annuel **non exposé** côté UI | ⚠️ | Majeur | S |
| MVP §15 | Enseignants ne saisissent pas encore les notes | Saisie réservée staff (`require_staff`) ; professeur **peut** saisir via `/professor/grades` — acceptable si admin saisit en pratique, mais porte ouverte | ⚠️ | Mineur | S |

### 2.4 Écarts techniques transverses (non listés section par section)

| Réf. | Exigence | État | Verdict | Gravité | Effort |
|------|----------|------|---------|---------|--------|
| TECH-1 | Documentation à jour | Monolithe legacy retiré (2026-06-15) ; stack unique microservices | ✅ | — | — |
| TECH-2 | Page bulletins admin : toutes les classes | `BulletinsWorkspace` charge **toujours** `api.getProfessorClasses()` même pour admin (`SchoolOperations.jsx` L903), pas `fetchClasses()` → admin peut ne voir **aucune** ou un sous-ensemble de classes | 🔴 | **Bloquant** | S |
| TECH-3 | RLS PostgreSQL (second rempart tenant) | Infrastructure `tenant_session()` prête ; services utilisent filtrage applicatif seul | ⚠️ | Majeur | L |
| TECH-4 | Cloche header notifications | `SaaSLayout.jsx` : 3 notifications **mockées**, non branchées sur `fetchNotifications()` | ⚠️ | Mineur | S |
| TECH-5 | Tests E2E / frontend | 9 fichiers tests backend ; **aucun** test frontend (Vitest/Playwright) | ⚠️ | Mineur | M |
| TECH-6 | Livraison réelle SMS/WhatsApp/Email | Stubs journalisent et marquent SENT ; pas d'intégration Twilio/SMTP | ⚠️ | Majeur | L |

---

## 3. Synthèse

### 3.1 Non-conformités **bloquantes** (priorité absolue)

1. **🔴 Bulletin annuel non conforme au MVP (§13)** — Le moteur `scope=annual` calcule une moyenne sur 6 séquences, alors que le cahier MVP exige **Moyenne T1, T2, T3 puis Moyenne Annuelle** par matière. De plus, **aucune interface** ne permet de sélectionner « Bulletin annuel » ni d'exporter le PDF correspondant (`BulletinsWorkspace` L954, `api.js` `fetchClasseBulletins` sans paramètre `scope`).

2. **🔴 Page bulletins admin limitée aux classes professeur** — `BulletinsWorkspace` appelle `getProfessorClasses()` pour tous les rôles (`SchoolOperations.jsx` L903). Un administrateur d'établissement sans attributions enseignant ne peut pas générer/publier les bulletins de l'ensemble des classes.

### 3.2 Non-conformités **majeures**

3. **⚠️ Seed référentiel incomplet** — Matières obligatoires (`is_obligatoire`), séries techniques sans listes, mapping anglophone Upper Sixth absents (`seed_data.py` L6-12). Impact direct sur §5.2 et fiabilité des bulletins d'examen.

4. **⚠️ Recherche/filtres absents sur tableaux §9** — Exigence explicite « recherche + filtres en haut » ; composant prêt (`filters` prop) mais non utilisé.

5. **⚠️ Appréciations non paramétrables (MVP §14)** — Barème fixe dans le code ; pas d'écran admin pour ajuster les seuils.

6. **⚠️ Isolation tenant sans RLS** — Correcte en app-layer + tests, mais sans second rempart PostgreSQL.

7. **⚠️ Notifications : envoi réel non implémenté** — Historisation OK ; providers externes en stub.

### 3.3 Manquements **mineurs**

- Liens sidebar `?fonction=enseignant` / `?tab=inscription` ignorés (même liste affichée).
- Rubrique **Extra** hors cahier (Présences, Paiements, Dépenses…) — décision produit à trancher.
- Classe élève : lien vers liste classes, pas vers fiche classe.
- Parent non strictement obligatoire à l'inscription (bloc optionnel).
- Cloche header : notifications fictives.
- Dashboard professeur : statistiques hardcodées (`ProfessorDashboardPage`).

### 3.4 Risques

| Risque | Description | Sévérité |
|--------|-------------|----------|
| **Intégrité référentiel** | Lacunes seed → classes avec matières/coefficients incorrects pour certaines séries | Élevé |
| **Isolation tenant** | Failles applicatives non compensées par RLS | Moyen |
| **Bulletins fin d'année** | MVP non livrable sans bulletin annuel conforme + UI admin | Élevé |
| **Notifications production** | Stubs masquent les échecs d'envoi réels | Moyen |

### 3.5 Bilan chiffré

| Périmètre | Conformité estimée |
|-----------|-------------------|
| 15 règles métier | **12 ✅ · 3 ⚠️** (R3 RLS, R6 données obligatoires, R12 parent optionnel) |
| Sections cahier §1–§13 | **~85 %** — socle solide, écarts sur filtres §9, stubs §12, seed partiel |
| Module MVP notes/bulletins | **~75 %** — moteur T3 + saisie OK ; **bulletin annuel = écart bloquant** |
| Checklist §13 (15 points) | **11/15 ✅ · 3 ⚠️ · 1 ❌** |

**Checklist §13 détaillée :**

| Point | Statut |
|-------|--------|
| Tables référentiel créées et pré-remplies | ⚠️ (lacunes seed) |
| Création classe par cascade | ✅ |
| Matières auto-proposées à création classe | ✅ |
| Décochage matière obligatoire avec confirmation | ⚠️ (mécanisme OK, données manquantes) |
| Matières spéciales étiquetées | ✅ |
| Création élève cascade + filtre classes | ✅ |
| Élève hérite matières classe | ✅ |
| Formulaire enseignant sans email exigé | ✅ |
| Formulaire direction 2 téléphones | ✅ |
| Login téléphone + mot de passe | ✅ |
| Sidebar ordre §8 | ⚠️ (Extra hors cahier) |
| Classes/Enseignants/Élèves en tableaux | ✅ |
| Outil Promotion/Passage | ✅ |
| Bulletin complet FR/EN | ⚠️ (T3 OK ; annuel non conforme MVP) |
| Notifications conformes §12 | ⚠️ (stubs envoi) |

### 3.6 Évolution depuis l'audit du 13/06/2026

Les écarts suivants, signalés comme **bloquants** dans l'audit précédent, sont **corrigés** dans le code actuel :

- Cascade création classe et élève (frontend branché sur `/referentiel/*`)
- Sidebar hiérarchique dépliable conforme §8
- Référentiel MINESEC lecture seule + garde-fou superadmin écriture
- Section matières complémentaires dans le PDF
- Annonces (Communication)
- Profil école consommé comme filtre cascade
- Colonnes tableaux enrichies (effectif réel, matières/classes enseignants)

---

## ⛔ STOP — Validation attendue

**Aucune correction ne sera appliquée avant votre validation de cet audit.**

Points d'arbitrage souhaités avant la Phase 2 (`PLAN_REMEDIATION.md`) :

1. **Rubrique « Extra »** (Présences, Emplois du temps, Paiements, Dépenses, Rapports) : masquer/retirer pour coller strictement à §8, ou conserver dans « Extra » ?
2. **Bulletin annuel MVP** : adopter le modèle **Moy T1 + Moy T2 + Moy T3 → Moy annuelle** (cahier MVP), ou conserver le modèle actuel **6 séquences agrégées** (plus proche du format Cameroon monolithe) ?
3. **Appréciations** : barème officiel Cameroun (actuel) ou barème paramétrable MVP (18–20 Excellent, etc.) — ou les deux selon le sous-système ?
4. **Parent obligatoire à l'inscription** : rendre le bloc parent strictement requis, ou le laisser optionnel ?

Dès votre validation (et vos arbitrages), je rédige `PLAN_REMEDIATION.md` — puis j'attendrai à nouveau votre feu vert avant toute modification de code.
