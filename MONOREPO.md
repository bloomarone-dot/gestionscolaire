# Monorepo — SaaS Scolaire (microservices)

Architecture cible décrite dans [ARCHITECTURE.md](ARCHITECTURE.md).  
État des lieux et écarts : [AUDIT_ECARTS.md](AUDIT_ECARTS.md).

## Structure

```
apps/
  web/                     # Frontend React+Vite+Tailwind (port de l'existant — à venir)
services/
  api-gateway/             # ✅ FastAPI — routage, JWT, injection X-Tenant-Id
  auth-service/            # ✅ login téléphone+mot de passe, JWT (service de référence)
  tenant-service/          # ✅ profil école, sous-systèmes/types actifs (filtre §14), canaux notif
  referentiel-service/     # ✅ référentiel MINESEC + seed (cascade, coefficients, tree)
  pedagogie-service/       # ✅ classes (cascade §4), matières de classe (§5), spéciales, confirmation §5.2
  personnel-service/       # ✅ enseignants (§7.1), direction 2 tél. (§7.2), compte via auth-service
  eleves-service/          # ✅ inscriptions (§6), parents, héritage matières (§6.2), transferts, promotions (§10)
  evaluations-service/     # ✅ saisie notes (§11.1) + fenêtres de saisie + bornes 0-20
  bulletins-service/       # ✅ calculs moyennes/rangs (§11), section spéciales (§11.3), FR/EN, PDF
  notifications-service/   # ✅ consumer RabbitMQ §12, multi-canal, historique, jamais bloquant
libs/
  common/                  # ✅ lib partagée : config, JWT, tenant/RLS, db, security, events, http
apps/web → frontend/       # ✅ frontend React+Vite (nginx en prod), proxy vers la gateway
docker-compose.yml         # ✅ lanceur complet (Postgres + RabbitMQ + Redis + gateway + 9 services + frontend)
infra/postgres/init/       # ✅ création des N bases logiques
```

`✅` complet · `🟡` squelette bootable (health + structure ; logique métier ajoutée phase par phase depuis le service de référence).

## Démarrage (dev)

```bash
# (optionnel) secrets : export JWT_SECRET=... INTERNAL_SHARED_SECRET=...
docker compose up --build      # depuis la racine du dépôt
```

- Frontend : http://localhost:5173 (nginx proxifie l'API vers la gateway)
- Gateway : http://localhost:8080 (santé : `/health`)

> Seuls le frontend (`WEB_PORT`, défaut 5173) et la gateway (`GATEWAY_PORT`,
> défaut 8080) sont exposés sur l'hôte. Postgres, Redis et RabbitMQ restent
> **internes** au réseau Docker (aucun conflit de port possible). Pour les
> inspecter : `docker compose exec postgres psql -U gs` (ou décommenter leur
> bloc `ports` dans docker-compose.yml).

## Conventions de service

Chaque service suit la structure de `auth-service` (référence) :
`app/{config,models,schemas,main}.py`, `requirements.txt`, `Dockerfile`
(contexte de build = racine du monorepo pour embarquer `libs/common`).

- Multi-tenant : colonne `tenant_id` + **RLS PostgreSQL** (`common.db.tenant_session`).
- Auth : la gateway valide le JWT et injecte `X-User-Id` / `X-Role` / `X-Tenant-Id`
  (+ `X-Internal-Secret`). Les services lisent ce contexte via `common.tenant`.
- Événements : `common.events` (RabbitMQ), best-effort, jamais bloquants.

Le monolithe legacy a été retiré ; seule la stack microservices + frontend `pages/modern/` est maintenue.
