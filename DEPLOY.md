# Déploiement production

Stack cible : **Docker Compose** (PostgreSQL + RabbitMQ + Redis + 9 services + frontend nginx).

## Checklist avant mise en production

- [ ] Définir `JWT_SECRET` et `INTERNAL_SHARED_SECRET` (longs, aléatoires, uniques)
- [ ] `docker compose up --build -d`
- [ ] `./scripts/seed-superadmin.sh` puis changer le mot de passe superadmin
- [ ] Vérifier `/health` sur la gateway
- [ ] Configurer un reverse-proxy HTTPS (nginx/Caddy) devant le frontend `:5180`
- [ ] Brancher les providers réels dans `notifications-service/app/delivery.py` (SMS, WhatsApp, Email)

## Variables d'environnement

| Variable | Service | Description |
|----------|---------|-------------|
| `JWT_SECRET` | gateway, auth, tous | Signature des tokens JWT |
| `INTERNAL_SHARED_SECRET` | gateway + services | Confiance des en-têtes `X-Tenant-Id` |
| `GATEWAY_PORT` | gateway | Port hôte (défaut `8082`) |
| `WEB_PORT` | frontend | Port hôte (défaut `5180`) |

## Persistance des données

Les données PostgreSQL sont stockées dans le volume Docker `pg_data`.  
**Ne pas supprimer** ce volume lors des mises à jour de code :

```bash
docker compose up --build -d   # met à jour les images, conserve les données
```

Sauvegarde PostgreSQL (exemple) :

```bash
docker compose exec postgres pg_dumpall -U gs > backup.sql
```

## Mise à jour

```bash
git pull
docker compose up --build -d
./scripts/seed-superadmin.sh   # idempotent, ne recrée pas si déjà présent
```
