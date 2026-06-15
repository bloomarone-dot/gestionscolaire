# EduGestion — Gestion Scolaire SaaS

Application multi-établissements (microservices FastAPI + React/Vite/Tailwind).

## Structure du dépôt

```
services/          # 9 microservices + api-gateway
libs/common/       # Bibliothèque partagée (JWT, tenant, events)
frontend/          # Interface React (pages/modern/)
infra/postgres/    # Initialisation des bases PostgreSQL
scripts/           # Utilitaires (seed superadmin, import Excel)
docker-compose.yml # Lanceur complet
```

Documentation complémentaire : [ARCHITECTURE.md](./ARCHITECTURE.md), [MONOREPO.md](./MONOREPO.md), [AUDIT_ECARTS.md](./AUDIT_ECARTS.md).

## Démarrage avec Docker (recommandé)

```bash
docker compose up --build -d
```

- **Frontend (nginx)** : http://localhost:5180
- **API Gateway** : http://localhost:8082 (santé : `/health`)

### Super-administrateur (premier lancement)

```bash
./scripts/seed-superadmin.sh
# ou :
SUPERADMIN_PHONE=691234567 SUPERADMIN_PASSWORD='MonMotDePasse!' ./scripts/seed-superadmin.sh
```

Identifiants par défaut : téléphone `690000000`, mot de passe `ChangeMe2026!`  
Connexion par **téléphone + mot de passe**.

### Arrêter / logs

```bash
docker compose down
docker compose logs -f api-gateway
```

## Développement local (frontend avec rechargement à chaud)

1. Démarrer la stack backend (sans le conteneur frontend) :

```bash
docker compose up --build -d postgres rabbitmq redis \
  auth-service tenant-service referentiel-service pedagogie-service \
  personnel-service eleves-service evaluations-service bulletins-service \
  notifications-service api-gateway
```

2. Lancer Vite :

```bash
cd frontend
npm install
npm run dev
```

- **Frontend dev** : http://localhost:5173 (proxy API → gateway `:8082`)

Variables optionnelles : copier `infra/.env.example` et définir `JWT_SECRET`, `INTERNAL_SHARED_SECRET`.

## Configuration

```bash
cp infra/.env.example infra/.env   # secrets JWT (optionnel en dev)
```

Voir [DEPLOY.md](./DEPLOY.md) pour la checklist production.
