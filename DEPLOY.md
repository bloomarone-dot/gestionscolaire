# Déploiement production

Stack cible : **Docker Compose** (PostgreSQL + RabbitMQ + Redis + 11 services + frontend nginx).

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
cd /var/www/gestionscolaire
bash scripts/update-hostinger.sh
```

Ou manuellement :

```bash
git pull
bash scripts/ensure-postgres-databases.sh   # nouvelles bases (tresorerie_db, planning_db…)
docker compose up --build -d
./scripts/seed-superadmin.sh   # idempotent, ne recrée pas si déjà présent
```

## Migration depuis l'ancienne stack (monolithe SQLite)

Le dépôt n'utilise **plus** le service Docker `backend` (FastAPI monolithe sur le port 8000).

| Avant (monolithe) | Maintenant (microservices) |
|-------------------|----------------------------|
| `backend` + `frontend` | Postgres + RabbitMQ + Redis + 11 services + `api-gateway` + `frontend` |
| Frontend `:5173` | Frontend `:5180` (`WEB_PORT`) |
| API directe `:8000` | Gateway `:8082` (`GATEWAY_PORT`) |
| Login username | Login **téléphone + mot de passe** |

### Erreur : `service "backend" has neither an image nor a build context specified`

Cause la plus fréquente : un ancien **`docker-compose.override.yml`** sur le serveur (créé pour éviter le conflit de port 8000) référence encore `backend`, alors que ce service n'existe plus.

```bash
cd /var/www/gestionscolaire
ls -la docker-compose.override.yml

# Sauvegarder et retirer l'override obsolète
mv docker-compose.override.yml docker-compose.override.yml.bak

git pull
docker compose up --build -d
./scripts/seed-superadmin.sh
```

Vérifications :

```bash
docker compose ps
curl -s http://127.0.0.1:8082/health
curl -I http://127.0.0.1:5180/
```

Accès navigateur : `http://VOTRE_IP:5180` (plus `:5173` sauf si vous forcez `WEB_PORT=5173` dans `.env`).

### Données SQLite anciennes

Les bases SQLite (`master.db`, `tenants/`) ne sont **pas** migrées automatiquement vers PostgreSQL. Utilisez les scripts d'import (`scripts/import_school_excel.py`, `scripts/import_royal_priesthood.py`) ou restaurez via les procédures documentées dans `deploy-data/README.md`.
