# ARCHITECTURE.md — Phase 1 : Architecture cible (microservices)

> **Pré-requis :** Phase 0 validée. Stratégie de migration retenue = **Option B** (squelette microservices neuf + portage du code utile). Suppression de `lebon-admin/` actée.
> **Statut :** 🟡 Proposition pour validation. *Aucun code n'est écrit avant votre accord sur les décisions du §1.5.*

---

## 1.0 Principes directeurs

1. **Monorepo** (conséquence d'Option B) : un seul dépôt, services indépendamment déployables.
2. **Une DB PostgreSQL par service** — sauf cas justifiés (référentiel partagé en lecture).
3. **Le frontend ne parle qu'à l'API Gateway** ; jamais directement à un service.
4. **`tenant_id` (= école) transporté par le JWT** et **imposé sur chaque requête de données école**.
5. **Le référentiel national est commun, en lecture seule pour les écoles**, écriture réservée à l'admin plateforme.
6. **Réutilisation maximale** : le moteur de bulletins bilingue + PDF, la saisie de notes, l'auth et le branding existants sont **portés**, pas réécrits.

---

## 1.1 Découpage en services

| Service | Responsabilité | DB | Évén. émis | Évén. consommés |
| --- | --- | --- | --- | --- |
| **api-gateway** | Routage, validation JWT, CORS, agrégation, rate-limit | — | — | — |
| **auth-service** | Comptes personnel/parents, **login téléphone+mot de passe**, JWT (`tenant_id`, `role`, `sub`), refresh, droits | `auth_db` | `UserCreated` | — |
| **tenant-service** | Profil école, **sous-systèmes/types actifs** (filtre amont §14), canaux de notif activés, abonnement, branding/en-tête bulletin | `tenant_db` | `SchoolProfileUpdated` | — |
| **referentiel-service** | Référentiel national MINESEC, **lecture seule écoles / écriture admin plateforme**, seed | `referentiel_db` *(partagée, read-mostly)* | `ReferentielUpdated` | — |
| **pedagogie-service** | Classes (cascade), **matières de la classe** + coefficients, matières spéciales, classes spéciales | `pedagogie_db` | `ClassSubjectsUpdated` | `StudentEnrolled` |
| **personnel-service** | Enseignants, Direction/Administration (**2 tél. obligatoires**), matières enseignables | `personnel_db` | `TeacherAssigned` | — |
| **eleves-service** | Inscriptions (cascade + **filtre classes existantes**), **héritage matières**, parents/tuteurs, transferts, **promotions/passages** | `eleves_db` | `StudentEnrolled`, `StudentTransferred`, `StudentPromoted` | `ClassSubjectsUpdated` |
| **evaluations-service** | Saisie des notes par classe/matière/séquence-trimestre, fenêtres de saisie | `evaluations_db` | `GradesEntered` | — |
| **bulletins-service** | Calculs (moyennes, rangs, moyenne classe), bulletin **FR/EN**, section « complémentaires », **export PDF** | `bulletins_db` | `BulletinPublished` | `GradesEntered` |
| **notifications-service** | SMS/WhatsApp/Email + notif interne, **historique**, consommation des événements §12 | `notifications_db` | — | `StudentEnrolled`, `BulletinPublished`, `TeacherAssigned`, `ClassSubjectsUpdated`, `StudentTransferred` |

**Découpage confirmé tel quel ?** Une variante possible : fusionner `evaluations` + `bulletins` (couplage fort notes→bulletin) au départ, puis scinder plus tard. Voir §1.5.

---

## 1.2 Communication inter-services

### REST synchrone (via gateway)
Lectures/écritures directes. La gateway valide le JWT, en extrait `tenant_id`/`role`, et **propage** ces infos en en-têtes internes signés (`X-Tenant-Id`, `X-User-Id`, `X-Role`) aux services aval (qui ne re-décodent pas le JWT mais font confiance au réseau interne + secret partagé). Les appels service→service (ex. `bulletins` → `referentiel` pour les coefficients) passent par un client REST interne avec cache.

### Bus d'événements (asynchrone) — section 12
Événements publiés et consommés par `notifications-service` (et `pedagogie`/`eleves` pour l'héritage) :

| Événement | Producteur | Consommateurs | Effet métier |
| --- | --- | --- | --- |
| `StudentEnrolled` | eleves | notifications, pedagogie | SMS/WhatsApp parent ; matières héritées |
| `BulletinPublished` | bulletins | notifications | Notif parent (bulletin dispo) |
| `TeacherAssigned` | personnel | notifications | Notif enseignant |
| `ClassSubjectsUpdated` | pedagogie | notifications, eleves | Re-propagation matières aux élèves |
| `StudentTransferred` | eleves | notifications | Notif établissements/parent |

> **Règle d'or §13 :** l'envoi de notification est **best-effort et jamais bloquant**. Un email manquant ⇒ on retombe sur SMS/WhatsApp/notif interne, on log l'échec, **on ne casse jamais** l'inscription ni la publication du bulletin.

**Choix du broker (RabbitMQ vs Redis Streams) → à trancher au §1.5.**

---

## 1.3 Stratégie de multi-tenancy

**Recommandation : colonne `tenant_id` + Row-Level Security (RLS) PostgreSQL**, dans chaque DB de service contenant des données école.

| Stratégie | Pour | Contre | Verdict |
| --- | --- | --- | --- |
| **`tenant_id` + RLS** *(reco)* | Une seule DB par service ; isolation **forcée par la base** (policy `tenant_id = current_setting('app.tenant_id')`) même si un dev oublie un `WHERE` ; migrations simples ; scale fluide | Exige de **toujours** positionner `SET app.tenant_id` par requête (via middleware/`SessionLocal`) | ✅ Retenu |
| **Schéma par tenant** | Bonne isolation logique | Migrations × N schémas × N services ; provisioning lourd ; ne scale pas à des milliers d'écoles | ❌ |
| **DB par tenant** *(l'actuel)* | Isolation physique max | Incompatible référentiel partagé ; explosion combinatoire (services × écoles) ; opérations lourdes | ❌ (raison du remplacement) |

**Mécanisme :** la gateway met `tenant_id` (claim JWT) dans `X-Tenant-Id` → chaque service, à l'ouverture de session DB, exécute `SET LOCAL app.tenant_id = :tid`. Les policies RLS filtrent automatiquement. Le **superadmin/admin plateforme** peut bypasser via un rôle DB dédié (`BYPASSRLS`) pour l'administration.

---

## 1.4 Accès au référentiel partagé

Le `referentiel-service` est **la seule source de vérité** du référentiel national. Deux modes d'accès par les autres services :

| Besoin | Mécanisme |
| --- | --- |
| **Frontend** (listes en cascade) | REST via gateway → `referentiel-service` (`GET /subsystems`, `/levels?cycle=…`, `/subjects?level=…&serie=…` avec coefficients) |
| **pedagogie/bulletins** (héritage matières, coeff officiels) | **Appel REST interne + cache** (TTL + invalidation sur `ReferentielUpdated`). Pas de duplication de table. |
| **Écriture** | Réservée au rôle **admin plateforme** (endpoints protégés). Les écoles n'ont **aucun** endpoint d'écriture. |

`referentiel_db` est **read-mostly** : écriture rare (admin plateforme), lecture massive → cache applicatif + éventuel cache HTTP. Le référentiel **n'a pas de `tenant_id`** (commun à tous).

---

## 1.5 ✅ Décisions arbitrées (verrouillées)

| # | Décision | Choix retenu |
| --- | --- | --- |
| 1 | **Broker d'événements** | **RabbitMQ** (ack/retry/DLQ natifs, livraison fiable des notifications best-effort) |
| 2 | **Granularité initiale** | **10 services séparés** (découpage du cahier à la lettre, frontières nettes dès le départ) |
| 3 | **Orchestration dev** | **docker-compose** (gateway + 10 services + Postgres + RabbitMQ + Redis + frontend) ; k8s reporté |
| 4 | **API Gateway** | **FastAPI léger** (validation JWT, injection `X-Tenant-Id`, agrégation custom) |
| 5 | **PostgreSQL dev** | **1 conteneur, N bases logiques** (`auth_db`, `tenant_db`, `referentiel_db`, …) ; frontière logique respectée |

*Redis est conservé comme cache du référentiel (§1.4), distinct de RabbitMQ (bus d'événements).*

---

## 1.6 Layout du monorepo (cible)

```
gestionscolaire/
├── apps/
│   └── web/                      # Frontend React+Vite+Tailwind (port de l'existant utile)
├── services/
│   ├── api-gateway/              # FastAPI — routage, JWT, X-Tenant-Id, agrégation
│   ├── auth-service/             # login téléphone+mot de passe, JWT
│   ├── tenant-service/
│   ├── referentiel-service/      # + seed MINESEC (Phase 2)
│   ├── pedagogie-service/
│   ├── personnel-service/
│   ├── eleves-service/
│   ├── evaluations-service/
│   ├── bulletins-service/        # port du moteur bulletin_cameroon + PDF
│   └── notifications-service/    # consumer RabbitMQ
├── libs/
│   └── common/                   # lib Python partagée : JWT, tenant context, RLS helper,
│                                 #   client REST interne + cache, base événements
├── infra/
│   ├── docker-compose.yml        # tout l'environnement dev
│   └── postgres/init/            # création des N bases logiques
├── AUDIT.md
└── ARCHITECTURE.md
```

Chaque `services/*` : `app/` (FastAPI), `alembic/` (migrations), `Dockerfile`, `requirements.txt`, OpenAPI auto. Code mort retiré : **`lebon-admin/` supprimé** lors du scaffolding.

---

*Architecture verrouillée. Prochaine étape : scaffolding du monorepo (squelette des 10 services + gateway + lib commune + docker-compose + suppression `lebon-admin/`), puis **Phase 2 (référentiel + seed)** dès réception du cahier des charges.*
