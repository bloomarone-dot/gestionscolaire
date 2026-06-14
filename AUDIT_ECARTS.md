# AUDIT_ECARTS.md — Phase 1 : Audit & Analyse d'écart

> **Projet :** `gestionscolaire` (BLOOMAR) — SaaS multi-tenant, établissements secondaires (Cameroun).
> **Date :** 2026-06-13
> **Périmètre audité :** code **réellement présent** (microservices `services/*` + `frontend/`), confronté au cahier des charges fonctionnel v1.0 (sections 1→13) et aux 15 règles métier de référence.
> **Statut :** 🔎 *Audit seul. Aucune correction n'est appliquée dans ce livrable.*

> ⚠️ **Note :** le fichier `AUDIT.md` du dépôt est l'audit **Phase 0 d'origine** (« aucun code écrit », monolithe SQLite). Il est **périmé** : le squelette microservices a depuis été construit. Le présent document **le remplace** comme état des lieux courant.

---

## 1. État des lieux du code

### 1.1 Architecture réelle

Monorepo microservices **FastAPI + PostgreSQL**, conforme à la cible :

```
services/
  api-gateway/        reverse-proxy JWT → injecte X-User-Id / X-Role / X-Tenant-Id
  auth-service/       login téléphone + mot de passe, émission JWT, comptes
  tenant-service/     écoles (=tenant), profil école (sous-systèmes/types actifs), canaux notif
  referentiel-service/ référentiel MINESEC partagé (cascade + seed + coefficients)
  pedagogie-service/  classes (cascade), matières de la classe (héritage, spéciales)
  personnel-service/  enseignants + direction (fonctions)
  eleves-service/     élèves, parents, transferts, promotions
  evaluations-service/ saisie des notes (par classe/matière/séquence/trimestre)
  bulletins-service/  calcul + PDF bilingue (reportlab)
  notifications-service/ mapping événements→messages, historique, worker
libs/common/          config, jwt, security (bcrypt), tenant ctx, db, events (RabbitMQ), http_client
frontend/             React + Vite + Tailwind (pages/modern/*)
```

Multi-tenant **applicatif** (`tenant_id` filtré en couche app ; RLS Postgres prévue Phase 5). `School.id == tenant_id`. Rôles : `superadmin` (tenant_id NULL), `admin`, `direction`, `enseignant`, `parent`.

### 1.2 Constat global

**Le backend est très majoritairement conforme.** La cascade, le seed du référentiel, l'auth par téléphone, l'héritage des matières, les promotions, les notifications et le moteur de bulletins existent et sont testés.

**Le frontend est le foyer principal des écarts.** Les formulaires de création (classe, élève) **n'exploitent pas** la cascade pourtant exposée par le backend : ils retombent sur des listes en dur et des champs texte libres — ce qui viole frontalement la règle phare « zéro saisie de noms officiels ». La sidebar ne respecte pas la hiérarchie §8.

---

## 2. Tableau d'écarts — livrable central

Légende **Verdict** : ✅ conforme · ⚠️ partiel · ❌ absent · 🔴 présent mais mal fait / non conforme.
**Gravité** : Bloquant / Majeur / Mineur. **Effort** : S (<1j) · M (1–3j) · L (>3j).

| Réf. | Exigence | État dans l'existant | Verdict | Gravité | Effort |
|---|---|---|---|---|---|
| **§1 / §2** | Référentiel national MINESEC, partagé, lecture seule écoles | Tables `subsystems/teaching_types/cycles/levels/series_specialties/level_series/subjects/subject_eligibility` présentes ; lecture ouverte authentifiés ([referentiel main.py:63+](services/referentiel-service/app/main.py#L63)) | ✅ | — | — |
| **§1** | Référentiel modifiable **seulement** par admin plateforme | Backend : `POST /referentiel/subjects` et `/eligibility` existent ([main.py:150-165](services/referentiel-service/app/main.py#L150)) mais **aucun garde-fou de rôle superadmin explicite**, pas de PUT/DELETE, **aucune UI** d'administration | 🔴 | Majeur | M |
| **§2 / §13.1** | Tables référentiel pré-remplies (seed exact tableaux A–D + matières 3.2→3.6 + coefficients) | Seed présent ([seed_data.py](services/referentiel-service/app/seed_data.py)) : subsystems, types, cycles, levels, series, subjects, éligibilités | ✅ | — | — |
| **(décision client)** | Domaines de matières (§3.1) | **Volontairement non intégrés** (décision client validée). `subject_eligibility.groupe` remplace pour les groupes de bulletin | ✅ (dérogation actée) | — | — |
| **§4 / Règle 2** | Création classe **en cascade** (Sous-syst.→Type→Cycle→Niveau→Série), zéro saisie officielle | **Backend OK**. **Frontend NON** : le formulaire ([SchoolOperations.jsx:223,285-289](frontend/src/pages/modern/SchoolOperations.jsx#L223)) utilise un tableau `levelOptions` **en dur** + un **champ texte libre « Série ou spécialité »** ; pas d'étapes Sous-système/Type/Cycle ; **0 appel** aux endpoints `referentiel/*` dans [api.js](frontend/src/api/api.js) | 🔴 | **Bloquant** | M |
| **§4.3** | Classe spéciale (niveau/spécialité texte libre, aucune matière pré-remplie, étiquette partout) | Backend gère `is_special`/`niveau_libre`/`specialite_libre` + statut « Spéciale ». Frontend : pas de bascule explicite « classe spéciale » (le texte libre actuel est un effet de bord, pas le flux §4.3) | ⚠️ | Majeur | M |
| **§4.2 / §5 / Règle 5** | Héritage auto des matières à la création (cochées + coeff défaut) | `create_class` charge les matières officielles via `fetch_official_subjects` et les active ([crud.py:172](services/pedagogie-service/app/crud.py#L172)) | ✅ | — | — |
| **§5.1 / §9** | Écran « Matières de la classe » en **tableau** | Présent ([SchoolOperations.jsx](frontend/src/pages/modern/SchoolOperations.jsx), OperationalSubjects) via `DataTable` | ✅ | — | — |
| **§5.2 / Règle 6** | Confirmation au décochage d'une matière obligatoire | Backend lève `ConfirmationRequired` (409) ([pedagogie crud.py:294](services/pedagogie-service/app/crud.py#L294)) ; frontend affiche un `window.confirm` ([SchoolOperations.jsx:409](frontend/src/pages/modern/SchoolOperations.jsx#L409)) | ✅ | — | — |
| **§5.3 / Règle 7** | Matières spéciales propres à l'école, étiquetées | `add_special_matiere` + source `SPECIALE` + étiquette ; isolation par `tenant_id` | ✅ | — | — |
| **§6 / Règle 4** | Création élève **en cascade** + **filtre des classes** correspondantes | **Frontend NON** : le formulaire élève ([SchoolOperations.jsx ~314](frontend/src/pages/modern/SchoolOperations.jsx)) a un simple select `classe_id` sur **toutes** les classes, **sans** cascade ni filtrage par profil choisi | 🔴 | **Bloquant** | M |
| **§6.1** | Matricule auto modifiable | Généré si absent, modifiable ([eleves schemas.py:29](services/eleves-service/app/schemas.py#L29)) | ✅ | — | — |
| **§6.1 / Règle 12** | Parents/tuteurs, **téléphone obligatoire**, email facultatif | Modèle `Parent` (phone NOT NULL), validateur ([eleves schemas.py:7-19](services/eleves-service/app/schemas.py#L7)). Frontend : 1 parent (nom+phone) seulement, pas de 2e numéro/adresse | ✅ backend / ⚠️ UI | Mineur | S |
| **§6.2** | Élève hérite des matières activées de sa classe | `GET /eleves/{id}/matieres` dérive de la classe ([eleves main.py:129](services/eleves-service/app/main.py#L129)) | ✅ | — | — |
| **§6.3** | Transferts (même niveau, historique conservé) | `POST /eleves/{id}/transfer` ([eleves main.py:146](services/eleves-service/app/main.py#L146)) | ✅ backend / ⚠️ pas d'UI dédiée | Mineur | S |
| **§7.1 / Règle 9** | Enseignant : téléphone obligatoire, email facultatif | Auth + personnel : phone requis, email nullable ([auth models.py:38](services/auth-service/app/models.py#L38)) | ✅ | — | — |
| **§7.2 / Règle 10** | Direction : **2 téléphones obligatoires**, email facultatif | Validé backend ([auth main.py:103](services/auth-service/app/main.py#L103)) + frontend ([SchoolOperations.jsx:152,202](frontend/src/pages/modern/SchoolOperations.jsx#L152)) | ✅ | — | — |
| **§7.3 / Règle 9** | Login **téléphone + mot de passe** pour tout le personnel | `POST /auth/login` sur `phone` ([auth main.py:50-54](services/auth-service/app/main.py#L50)) | ✅ | — | — |
| **§8 / Règle 13** | Sidebar dans l'ordre **hiérarchique exact**, rubriques dépliables | Sidebar **plate** ([SaaSLayout.jsx:11-27](frontend/src/components/layout/SaaSLayout.jsx#L11)) : pas de regroupement (Structure Pédagogique / Personnel / Élèves / Évaluations / Communication / Paramètres), ordre différent, et items **hors cahier** (Présences, Emplois du temps, Paiements, Dépenses, Rapports) | 🔴 | Majeur | M |
| **§8** | Sous-rubrique « Référentiel MINESEC » (lecture seule pour l'école) | **Absent** côté frontend | ❌ | Mineur | S |
| **§8 / §12** | Sous-rubrique « Communication › Annonces » | **Absent** (aucune feature annonces ; pas d'event `AnnouncementPublished`) | ❌ | Mineur | M |
| **§9.1** | Tableau **Classes** colonnes exactes (Sous-système, Type, Niveau, Série, Effectif actuel/max, Prof principal, Nb matières, Statut) | Affichage **en tableau** (`DataTable`) ✅ mais **colonnes incomplètes** : il manque Sous-système/Type (badges), Série, effectif actuel, le **nom** du prof principal | ⚠️ | Mineur | S |
| **§9.2** | Tableau **Enseignants** (Matières enseignées, Classes assignées, Statut) | Tableau présent, mais colonnes Matières/Classes/Statut **non renseignées** | ⚠️ | Mineur | M |
| **§9.3** | Tableau **Élèves** (Matricule, Nom, Classe cliquable, Sexe, Contact parent, Statut) | Tableau présent et proche ; classe non cliquable, statut peu exploité | ⚠️ | Mineur | S |
| **§9 (règle générale)** | Jamais de cartes pour Classes/Enseignants/Élèves | `DataTable` = `<table>` partout sur les pages opérationnelles | ✅ | — | — |
| **§10 / Règle 15** | Promotions/Passages (Admis/Redouble/Réorienté/Sortant + ré-inscription auto) | Backend `POST /eleves/promotions/apply` ✅ ; frontend `PromotionsPage` ✅ (livré aujourd'hui). **Manque** : proposition **auto** de la classe de destination « logique » (§10.2) — actuellement choix manuel | ✅ / ⚠️ (suggestion auto) | Mineur | S |
| **§11.1/§11.2 / Règle 14** | Bulletin : matières activées + coeff officiels, moyennes, rangs, moyenne classe, FR/EN, signatures | Moteur complet ([compute.py](services/bulletins-service/app/compute.py), [pdf.py](services/bulletins-service/app/pdf.py)) ; bilingue ; signatures (+ nom prof principal ajouté ce jour) | ✅ | — | — |
| **§11.3 / Règle 7** | Section séparée « Matières complémentaires de l'établissement » (spéciales) | `compute.py` **sépare** déjà les données (`special_subjects`, [compute.py:56,119](services/bulletins-service/app/compute.py#L56)) **mais `pdf.py` ne rend aucune section dédiée** (0 occurrence de `special_subjects` dans le PDF) | ⚠️ | Majeur | M |
| **§12 / Règle 14** | Notifications multi-canal sur déclencheurs (inscription, bulletin, assignation, MAJ matières, transfert/promotion) | `mapping.py` couvre Enrolled/BulletinPublished/TeacherAssigned/ClassSubjectsUpdated/Transferred/Promoted + historique `notifications` ([models.py:16](services/notifications-service/app/models.py#L16)) | ✅ | — | — |
| **§12** | Déclencheur « Annonce générale » | **Absent** (pas d'event ni de feature) | ❌ | Mineur | M |
| **§12 / Règle 14** | Jamais bloquant si email manquant ; email seulement si fourni | EMAIL ajouté au canal **uniquement si adresse présente** ([mapping.py:32-33](services/notifications-service/app/mapping.py#L32)) | ✅ | — | — |
| **§12.2** | Config des canaux par école + historisation | Modèle `NotificationChannel` (tenant) + table d'historique | ✅ backend / ⚠️ pas d'UI de configuration | Mineur | S |
| **§14 / Règle 14 (profil école = filtre amont)** | Sous-systèmes/types actifs conditionnent les listes de création | Backend : `school_subsystems`/`school_teaching_types` existent ([tenant models.py:58-79](services/tenant-service/app/models.py#L58)). **Frontend ne les consomme pas** (les formulaires ne filtrent pas la cascade par profil) | ⚠️ | Majeur | M |
| **Règle 3** | Multi-tenant strict (matière spéciale École A invisible École B) | Filtrage `tenant_id` systématique ; `SpecialSubject` lié au tenant | ✅ (app-layer ; RLS Phase 5) | Mineur | — |

---

## 3. Synthèse

### 3.1 Non-conformités **bloquantes** (à traiter en premier)

1. **🔴 Cascade absente dans le formulaire de création de classe** (§4 / Règle 2). Le backend expose tout (`/referentiel/subsystems|teaching-types|cycles|levels|.../series`), mais l'UI utilise une liste de niveaux **en dur** et un **champ texte libre pour la série** → viole « zéro saisie de noms officiels » et la cascade dépendante. **C'est l'écart numéro 1.**
2. **🔴 Cascade + filtrage des classes absents dans le formulaire élève** (§6). L'inscription propose toutes les classes sans cascade ni filtre par profil choisi.
3. **🔴 Sidebar non conforme à §8** : plate, désordonnée, non dépliable, avec des entrées hors cahier (Présences, Emplois du temps, Paiements, Dépenses, Rapports).

### 3.2 Non-conformités **majeures**

4. **🔴 Référentiel modifiable côté admin plateforme** (§1) : endpoints d'écriture sans contrôle de rôle superadmin explicite ni UI ; pas de PUT/DELETE.
5. **⚠️ Bulletin — section « Matières complémentaires » non rendue** (§11.3) : données séparées en calcul, mais absentes du PDF.
6. **⚠️ Profil école non utilisé comme filtre amont** (§14) : données présentes, non consommées par le frontend.
7. **⚠️ Classes spéciales** (§4.3) : pas de flux UI explicite « cette classe est spéciale ».

### 3.3 Manquements fonctionnels mineurs

- Écran « Référentiel MINESEC » lecture seule (§8) — absent.
- « Communication › Annonces » + event annonce (§8/§12) — absent.
- Colonnes exactes des tableaux §9.1/9.2/9.3 incomplètes (Matières/Classes enseignées, badges Sous-système/Type, effectif actuel, classe cliquable).
- Promotions : suggestion **automatique** de la classe de destination (§10.2) — actuellement manuelle.
- Pas d'UI dédiée transfert (§6.3) ni de configuration des canaux de notification (§12.2).

### 3.4 Risques

- **Sécurité — écriture du référentiel** : sans garde-fou de rôle, une école pourrait théoriquement écrire dans le référentiel national partagé (à vérifier au niveau gateway). **Risque d'intégrité du référentiel commun.**
- **Isolation tenant** : correcte en couche applicative, mais **RLS Postgres non encore activée** (reportée Phase 5) → une faille de filtrage applicatif n'aurait pas de second rempart.
- **Conformité « zéro saisie »** : tant que les formulaires UI restent en texte libre, les données de classes seront **incohérentes avec le référentiel** (noms/niveaux/séries non normalisés), ce qui dégrade en aval les bulletins et statistiques d'examen.

### 3.5 Bilan

Le **socle backend couvre ~85 %** des exigences (référentiel, auth, héritage, promotions, notifications, bulletins). L'essentiel du travail restant est **frontend** : **brancher les formulaires sur la cascade existante**, **restructurer la sidebar (§8)**, compléter les tableaux (§9), et finir deux détails backend↔PDF (section matières complémentaires, garde-fou référentiel).

---

## ⛔ STOP — Validation attendue

Merci de **valider cet audit** avant la Phase 2 (plan de remédiation). Points sur lesquels j'aimerais ton arbitrage dès maintenant :

1. **Items « hors cahier » de la sidebar** (Présences, Emplois du temps, Paiements, Dépenses, Rapports) : les **masquer/retirer** pour coller à §8, ou les **conserver** dans une rubrique « Extras » hors cahier ?
2. **Annonces (§8/§12)** : dans le périmètre à livrer, ou hors scope pour l'instant ?
3. **Référentiel MINESEC en lecture seule pour l'école (§8)** : écran à ajouter, ou différé ?

Dès ta validation, je rédige `PLAN_REMEDIATION.md` (corrections ordonnées par domaine, fichiers impactés, options à trancher) — puis j'attends de nouveau ton feu vert avant de coder.
