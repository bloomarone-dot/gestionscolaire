# AUDIT.md — Phase 0 : Audit de l'existant

> **Projet :** `gestionscolaire` (BLOOMAR) — futur SaaS multi-tenant de gestion d'établissements secondaires (Cameroun).
> **Date de l'audit :** 2026-06-12
> **Auteur :** Architecte / Lead Dev
> **Statut :** ⛔ *Aucun code n'a été écrit. Ce document est livré pour validation avant la Phase 1.*

---

## 0.1 Cartographie technique

### Stack réelle détectée

| Couche | Technologie détectée | Conforme à la cible imposée ? |
| --- | --- | --- |
| **Frontend** | React **19.2** + **Vite 5.4** + **Tailwind 3.4** (fraîchement ajouté) | ✅ stack OK… **mais** l'UI réelle repose sur **AdminLTE 3 + Bootstrap 4 + jQuery + recharts + lucide-react**. Tailwind/PostCSS viennent juste d'être introduits (non encore utilisés par l'app principale). |
| **Backend** | Python **3.12** / **FastAPI** (monolithe), SQLAlchemy, Alembic, passlib[bcrypt], python-jose (JWT), reportlab (PDF), openpyxl (Excel) | ⚠️ FastAPI ✅ mais **monolithe**, pas microservices. |
| **Base de données** | **SQLite** par défaut (`master.db`) + **une base SQLite/SQL Server par établissement** | ❌ Cible imposée = **PostgreSQL** (une DB par service). |
| **Bus d'événements** | **Aucun** | ❌ Cible = RabbitMQ / Redis Streams. |
| **API Gateway** | **Aucun** | ❌ Cible = gateway. |
| **Build / runtime** | npm (Node 22), Docker (1 image backend + 1 image frontend/nginx), `docker-compose` | ⚠️ compose existe mais ne lance que backend + frontend. |
| **CI** | Aucune détectée | — |

### Structure des dossiers

```
gestionscolaire/
├── backend/                 # Monolithe FastAPI
│   ├── app/
│   │   ├── main.py          # Point d'entrée, lifespan (provisioning tenants)
│   │   ├── core/config.py   # Settings (SECRET_KEY, DATABASE_URL)
│   │   ├── auth/security.py  # JWT, hash, get_current_user
│   │   ├── db/              # connection, multi_tenant, tenant_tables, seed, migrations
│   │   ├── models/school.py # TOUS les modèles (master + tenant) dans 1 fichier
│   │   ├── api/             # auth, schools, admin, professor, superadmin, notes, bulletins, endpoints
│   │   └── services/        # bulletin_cameroon, bulletin_pdf, sections, evaluation_types…
│   ├── alembic/             # 2 migrations
│   └── requirements.txt
├── frontend/                # React + Vite
│   └── src/
│       ├── pages/, components/, layouts/, context/, hooks/, styles/ (CSS classiques)
│       └── lebon-admin/     # ⚠️ TEMPLATE RESTAURANT étranger (à retirer — voir §0.5)
├── deploy-data/             # master.db + tenants/school_1.db, school_2.db (données démo)
├── docker-compose.yml, Dockerfile, scripts/ (backup/restore/sync)
└── DEPLOY.md, README.md
```

### Architecture actuelle

**Monolithe FastAPI** avec un découpage **par fichier de routes** (pas par service). Les routeurs (`auth`, `schools`, `admin`, `professor`, `superadmin`, `notes`, `bulletins`, `endpoints`) sont tous montés dans une seule app. Aucune frontière réseau, aucun découpage en domaines déployables séparément.

**Le multi-tenant est physique (base par établissement)** : voir §0.5.

---

## 0.2 Modèle de données existant

Deux familles de tables (fichier unique [models/school.py](backend/app/models/school.py)) :

### Base **maître** (`DATABASE_URL` → `master.db`)
| Table | Rôle |
| --- | --- |
| `schools` | Métadonnées établissement **+ identifiants de connexion à sa DB** (`db_host/port/name/username/password`) + identité visuelle + en-tête bulletin Cameroun. |
| `admins` | Comptes admin/superadmin (login = `username`, `email` **unique NOT NULL**). |
| `activity_logs` | Audit. |

### Base **tenant** (1 fichier SQLite / 1 DB SQL Server par école)
| Table | Notes vs cahier des charges |
| --- | --- |
| `users` | Embryon inutilisé. |
| `annees_scolaires` | OK. |
| `classes` | `niveau` = **texte libre**, `serie` = **texte libre nullable**, `section` = francophone/anglophone. ❌ Pas de cascade, pas de rattachement au référentiel. |
| `matieres` | **Globales au tenant** (pas par classe), `nom`/`code`/`coefficient_defaut` **saisis librement**. ❌ Pas de notion officielle/spéciale, pas d'éligibilité niveau↔série. |
| `professeurs` | `email` **unique NOT NULL** ❌ (cahier : facultatif), `phone` + `phone2` **nullables**. |
| `attributions_professeurs` | Prof ↔ classe ↔ matière. ✅ réutilisable. |
| `eleves` | `nom/prenom/matricule/sexe/classe_id`. ❌ **Aucune info parent/tuteur**. |
| `notes` | eleve ↔ matiere ↔ prof, `trimestre` + `type_evaluation` (sequence_1/2, trimestre). ✅ |
| `periodes_saisie_notes` | Fenêtres de saisie. Bonus utile. |
| `emploi_temps`, `bulletins` | EDT (UI désactivée), bulletins stockés. |

### Notions du référentiel national → **TOTALEMENT ABSENTES**
`grep` sur `referentiel | cascade | subsystem | cycle | eligibilite | specialite` → **0 résultat** côté structure. Aucune table : pas de `subsystems`, `teaching_types`, `cycles`, `levels`, `series_specialties`, `domains`, `subjects` (référentiel), ni `subject_eligibility` (coefficients par défaut). Les coefficients et niveaux sont aujourd'hui **tapés à la main**.

---

## 0.3 Inventaire fonctionnel

### Existe et fonctionne ✅ (réutilisable)
- **Auth JWT** (admin/superadmin + professeur) avec rôle + `school_id` dans le token.
- **Multi-tenant physique** : provisioning automatique d'une base par école, isolation forte par construction.
- **CRUD** classes / matières / professeurs / élèves / années scolaires / attributions.
- **Saisie des notes** par classe/matière/séquence-trimestre + **fenêtres de saisie** (délais).
- **Bulletins Cameroun bilingues** : [bulletin_cameroon.py](backend/app/services/bulletin_cameroon.py) gère **FR/EN selon la section**, groupes de matières, moyennes, rangs, appréciations (NA/ECA…), décisions (ADMIS/PASSED), **export PDF reportlab** + en-tête officiel (délégation, devise, BP). → **Pièce maîtresse à porter telle quelle.**
- **Import/export** élèves (xlsx/csv), templates.
- **Espaces** superadmin / admin / professeur côté frontend, branding par école.

### Existe mais incomplet / non conforme ⚠️
- **Login = `username`**, pas téléphone (cahier exige **téléphone + mot de passe**).
- **`email` obligatoire** sur `admins` ET `professeurs` (cahier : jamais bloquant).
- **Matières globales tenant**, pas de matières **par classe** activables avec coefficient par classe, ni confirmation au décochage.
- **Sidebar** réduite (4 entrées) — pas l'ordre hiérarchique de la section 8.
- **Listes Classes & Professeurs en CARTES** ([ClassesList.jsx](frontend/src/components/ClassesList.jsx) `classe-card`, [ProfesseursList.jsx](frontend/src/components/ProfesseursList.jsx) `prof-card`) → cahier impose **tableaux**. (Élèves = déjà en tableau ✅.)

### Absent ❌
- **Référentiel national MINESEC** + seed (sections 2 & 3).
- **Cascade** Sous-système → Type → Cycle → Niveau → Série (classe ET élève).
- **Héritage automatique** des matières classe → élève.
- **Matières spéciales** / **classes spéciales** (étiquetage, section bulletin séparée).
- **Parents/tuteurs** (modèle + téléphone obligatoire).
- **Direction = 2 téléphones obligatoires.**
- **Promotions / passages** (section 10).
- **Notifications** (section 12) : aucun service, aucun canal SMS/WhatsApp/Email/interne, aucun événement, aucun historique.
- **Filtre amont par profil école** (sous-systèmes/types actifs).
- **Filtre des classes existantes** à l'inscription élève selon le profil choisi.

---

## 0.4 Analyse d'écart (gap analysis) — livrable clé

Légende état : **✅ Présent** · **⚠️ Partiel** · **❌ Absent** — Effort : **S** < 1j · **M** 1-3j · **L** > 3j.

| # | Exigence du cahier des charges | État actuel | Effort | Service cible |
| --- | --- | --- | --- | --- |
| **1** | Référentiel national MINESEC, lecture seule écoles, écriture admin plateforme | ❌ Absent | L | referentiel-service |
| **2** | Tables référentiel (subsystems, types, cycles, levels, series, domains, subjects, **subject_eligibility + coeff**) | ❌ Absent | L | referentiel-service |
| **3** | **Seed** complet (tableaux A/B/C/D + listes matières 3.2→3.6 + coefficients exacts) | ❌ Absent | L | referentiel-service |
| **4.1** | Zéro saisie manuelle de noms officiels (listes en cascade) | ❌ Absent (texte libre) | M | pedagogie + web |
| **4** | Création classe en cascade (Sous-syst.→Type→Cycle→Niveau→Série) | ❌ Absent | L | pedagogie-service |
| **4.3** | Classe spéciale (texte libre, aucune matière pré-remplie, étiquette) | ❌ Absent | M | pedagogie-service |
| **5** | Héritage auto des matières à la création de classe (cochées + coeff défaut) | ❌ Absent | M | pedagogie-service |
| **5.2** | Confirmation obligatoire au décochage d'une matière officielle | ❌ Absent | S | web + pedagogie |
| **5.3** | Matières spéciales propres à l'école, étiquetées « Spéciale » | ❌ Absent | M | pedagogie-service |
| **6** | Élève en cascade + **filtre des classes existantes** correspondantes | ❌ Absent | M | eleves-service |
| **6.1** | Matricule auto modifiable | ⚠️ matricule présent, pas la cascade | S | eleves-service |
| **6.1** | Infos parents/tuteurs, **téléphone obligatoire**, email facultatif | ❌ Absent | M | eleves-service |
| **6.2** | Élève hérite auto des matières activées de sa classe | ❌ Absent | M | eleves + pedagogie |
| **6.3** | Transferts d'élèves | ❌ Absent | M | eleves-service |
| **7.1** | Enseignant : téléphone obligatoire, **email facultatif** | ⚠️ email NOT NULL ❌ | S | personnel-service |
| **7.2** | Direction : **2 téléphones obligatoires**, email facultatif | ❌ Absent | S | personnel-service |
| **7.3** | **Login téléphone + mot de passe** pour tout le personnel | ⚠️ login = username ❌ | M | auth-service |
| **8** | Sidebar dans l'ordre hiérarchique exact (TdB→Structure→Personnel→Élèves→Éval→Comm→Param) | ⚠️ partielle/désordonnée | S | web |
| **9** | Classes / Enseignants / Élèves en **tableaux** + recherche/filtres | ⚠️ Élèves OK, Classes & Profs en cartes ❌ | M | web |
| **10** | Promotions/Passages (Admis/Redouble/Réorienté/Sortant + ré-inscription auto) | ❌ Absent | L | eleves-service |
| **11.1** | Saisie des notes par classe/matière/période | ✅ Présent | — | evaluations-service |
| **11** | Bulletin : matières activées + coeff officiels, moyennes, rangs, moyenne classe | ⚠️ calculs OK mais sur matières libres, pas référentiel | M | bulletins-service |
| **11.3** | Section « Matières complémentaires » (spéciales) séparée | ❌ Absent | M | bulletins-service |
| **11.2** | Bilingue FR/EN, mise en page identique, signatures, PDF | ✅ Présent (très bon) | S | bulletins-service |
| **12** | Notifications multi-canal (SMS/WhatsApp/Email/interne) sur déclencheurs | ❌ Absent | L | notifications-service |
| **12** | Historisation des notifications | ❌ Absent | M | notifications-service |
| **12** | **Jamais bloquant si email manquant** | ⚠️ email obligatoire aujourd'hui ❌ | S | auth + eleves + personnel |
| **14** | Profil école = filtre amont (sous-systèmes/types actifs) | ❌ Absent | M | tenant-service |
| **—** | Architecture microservices + gateway + bus | ❌ Monolithe | L | infra |
| **—** | PostgreSQL (DB par service) | ❌ SQLite/SQL Server par tenant | L | infra |

**Bilan :** environ **70 % du périmètre fonctionnel reste à construire**, mais le socle réutilisable (auth JWT, CRUD, moteur de bulletins bilingue + PDF, saisie notes, multi-tenant) couvre les ~30 % les plus matures et fait gagner du temps.

---

## 0.5 Dette & risques

### Multi-tenant
- ✅ **Isolation très forte** : chaque école = sa propre base physique → aucune fuite croisée possible.
- ❌ **Inadapté à la cible** : (a) la stack impose **PostgreSQL** ; (b) un modèle « DB par fichier isolée » **ne sait pas exposer un référentiel national partagé** en lecture seule à toutes les écoles ; (c) ne se prête pas à un découpage microservices (chaque service voudrait sa propre DB, pas une DB par école par service → explosion combinatoire).
- ⚠️ **`login-professor` parcourt TOUTES les écoles** en ouvrant chaque base tenant pour trouver le username → coût O(n écoles) à chaque login, et ambiguïté inter-écoles gérée par erreur.

### Auth & conformité
- ❌ Login par `username`, pas par **téléphone** (exigence non négociable).
- ❌ `email` **NOT NULL** sur `admins` et `professeurs` → viole « email jamais bloquant ».
- ⚠️ JWT porte `school_id` (≈ tenant) mais pas un claim `tenant_id` nommé — à normaliser.

### Sécurité
- 🔴 **SECRET_KEY par défaut en dur** dans [config.py](backend/app/core/config.py) (fallback). À forcer via env, refuser le démarrage si absent en prod.
- 🔴 **Mots de passe DB tenant stockés en clair** dans `schools.db_password`.
- 🟠 SQL `CREATE/DROP DATABASE` construit par **f-string** (provisioning SQL Server) — entrée maîtrisée mais à durcir.
- 🟠 CORS configurable mais `allow_credentials=True` + origines à valider en prod.

### Pollution du dépôt
- 🔴 **`frontend/src/lebon-admin/`** = **template d'admin de RESTAURANT** (rôles serveur/cuisine/caisse/stock, pages Tables/Produits/Mouvements…). **Sans aucun rapport** avec la gestion scolaire ; importé dans [App.jsx](frontend/src/App.jsx) via `/lebon-admin/*`. C'est lui qui a tiré l'ajout de `tailwind.config.js` / `postcss.config.js`. → **À supprimer**, mais il peut servir de **référence de patterns Tailwind** (sidebar, layout) pour le nouveau frontend.

### Points de réécriture inévitables
1. Couche d'accès données (SQLite-par-fichier → PostgreSQL + `tenant_id`/RLS ou schéma).
2. Découpage monolithe → services + gateway + bus.
3. Auth (téléphone, email facultatif, claim `tenant_id`).
4. Modèle de données (introduction du référentiel + matières par classe + parents + promotions).

### À conserver / porter (forte valeur)
Moteur **bulletin Cameroun bilingue + PDF**, logique **séquences/trimestres**, **fenêtres de saisie**, **import/export élèves**, **branding par école**, conventions FR/EN ([sections.py](backend/app/services/sections.py)).

---

## 0.6 Recommandation de stratégie de migration

Le contexte est favorable à une refonte : **pas de production réelle** (seules 2 bases démo `school_1.db`/`school_2.db`), et **le changement de socle DB (SQLite→PostgreSQL) + le référentiel partagé sont incompatibles** avec le découpage actuel. Deux options.

### Option A — *Strangler Fig* : extraire progressivement des microservices depuis le monolithe
On garde le monolithe en marche, on place une **gateway** devant, puis on en détache un service à la fois (référentiel d'abord), en redirigeant le trafic au fur et à mesure.

| Avantages | Inconvénients |
| --- | --- |
| L'app reste fonctionnelle en continu. | On traîne longtemps le couplage SQLite-par-tenant. |
| Migration « sans big bang », validable par étapes. | Période de **double système** complexe (gateway + monolithe + nouveaux services). |
| Risque réparti dans le temps. | Le modèle DB actuel **bloque** le référentiel partagé → adapteurs jetables à écrire. |
| | Plus lent à atteindre la cible Postgres/microservices. |

### Option B — *Squelette microservices neuf* + portage du code utile **(recommandée)**
On crée un **monorepo** `services/*` + `apps/web` avec PostgreSQL, gateway et bus dès le départ, puis on **porte** les briques réutilisables (moteur bulletins/PDF, saisie notes, auth → adaptée téléphone, branding). On migre les 2 bases démo par un script.

| Avantages | Inconvénients |
| --- | --- |
| Atteint **directement** la cible imposée (Postgres, microservices, gateway, bus, référentiel partagé). | « Big bang » relatif : la nouvelle app doit atteindre la parité avant bascule. |
| Pas de dette SQLite-par-tenant à transporter. | Effort initial concentré avant la première démo complète. |
| Modèle de données propre (référentiel + multi-tenant `tenant_id`) dès le jour 1. | Réécriture des routes CRUD (mais logique métier portée). |
| Code mort (lebon-admin) écarté proprement. | |

> **Ma recommandation : Option B.** Comme il n'y a pas encore de tenants en production et que la cible impose un socle (PostgreSQL + microservices + référentiel partagé) **structurellement incompatible** avec l'actuel, repartir d'un squelette propre en **portant** le code à forte valeur (bulletins bilingues, PDF, notes, auth) est plus rapide et plus sain qu'un strangler qui devrait maintenir deux mondes. On reste incrémental **service par service** à l'intérieur de l'Option B.

---

## ⛔ STOP — Décisions attendues avant la Phase 1

1. **Stratégie de migration : Option A (strangler) ou Option B (squelette neuf, recommandée) ?**
2. Confirmez-vous la **suppression de `lebon-admin/`** (template restaurant) ?
3. Disposez-vous du **cahier des charges complet (sections 1→13, tableaux A/B/C/D, listes 3.2→3.6 et coefficients)** sous forme de fichier ? Le seed du référentiel (Phase 2) en dépend **mot pour mot** — sans lui je ne peux pas garantir les coefficients exacts.

*Une fois ces points tranchés, je rédige `ARCHITECTURE.md` (Phase 1) avec le découpage des services, le choix du broker, et la stratégie de multi-tenancy — puis j'attends de nouveau votre validation.*
