# Monorepo — SaaS Scolaire (microservices)

Squelette de l'architecture cible décrite dans [ARCHITECTURE.md](ARCHITECTURE.md)
(elle-même issue de l'[AUDIT.md](AUDIT.md)).

## Structure

```
apps/
  web/                     # Frontend React+Vite+Tailwind (port de l'existant — à venir)
services/
  api-gateway/             # ✅ FastAPI — routage, JWT, injection X-Tenant-Id
  auth-service/            # ✅ login téléphone+mot de passe, JWT (service de référence)
  tenant-service/          # ✅ profil école, sous-systèmes/types actifs (filtre §14), canaux notif
  referentiel-service/     # ✅ référentiel MINESEC + seed (cascade, coefficients, tree)
  pedagogie-service/       # 🟡 squelette bootable — classes (cascade), matières, coefficients
  personnel-service/       # 🟡 squelette bootable — enseignants, direction (2 tél.)
  eleves-service/          # 🟡 squelette bootable — inscriptions, héritage matières, promotions
  evaluations-service/     # 🟡 squelette bootable — saisie des notes
  bulletins-service/       # 🟡 squelette bootable — calculs + bulletin FR/EN + PDF
  notifications-service/   # 🟡 squelette bootable — notif multi-canal (consumer RabbitMQ)
libs/
  common/                  # ✅ lib partagée : config, JWT, tenant/RLS, db, security, events, http
infra/
  docker-compose.yml       # ✅ Postgres + RabbitMQ + Redis + gateway + auth-service
  postgres/init/           # ✅ création des N bases logiques
```

`✅` complet · `🟡` squelette bootable (health + structure ; logique métier ajoutée phase par phase depuis le service de référence).

## Démarrage (dev)

```bash
cd infra
cp .env.example .env        # adapter les secrets
docker compose up --build
```

- Gateway : http://localhost:8080 (santé : `/health`)
- RabbitMQ (console) : http://localhost:15672 (guest/guest)
- Postgres : `localhost:5432` (gs/gs), bases logiques créées au 1er démarrage

## Conventions de service

Chaque service suit la structure de `auth-service` (référence) :
`app/{config,models,schemas,main}.py`, `requirements.txt`, `Dockerfile`
(contexte de build = racine du monorepo pour embarquer `libs/common`).

- Multi-tenant : colonne `tenant_id` + **RLS PostgreSQL** (`common.db.tenant_session`).
- Auth : la gateway valide le JWT et injecte `X-User-Id` / `X-Role` / `X-Tenant-Id`
  (+ `X-Internal-Secret`). Les services lisent ce contexte via `common.tenant`.
- Événements : `common.events` (RabbitMQ), best-effort, jamais bloquants.

> ⚠️ L'ancien monolithe (`backend/`, `frontend/`) reste en place le temps du
> portage du code à forte valeur (bulletins FR/EN + PDF, saisie notes, branding).
