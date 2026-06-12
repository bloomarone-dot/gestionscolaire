# Gestion Scolaire SaaS

Application de gestion scolaire multi-établissements (FastAPI + React).

## Démarrage avec Docker (recommandé)

```bash
docker compose up --build -d
```

- **Frontend** : http://localhost:5173
- **API Gateway** : http://localhost:8080 (santé : `/health`)
- **RabbitMQ (console)** : http://localhost:15672 (guest/guest)

### Premier super-administrateur

Aucun compte n'existe au premier démarrage. Créez le super-administrateur
(idempotent) une fois la stack lancée :

```bash
./scripts/seed-superadmin.sh
# ou en personnalisant les identifiants :
SUPERADMIN_PHONE=691234567 SUPERADMIN_PASSWORD='MonMotDePasse!' ./scripts/seed-superadmin.sh
```

Identifiants par défaut : téléphone `690000000`, mot de passe `ChangeMe2026!`
(à changer après la première connexion). La connexion se fait par **téléphone +
mot de passe**.

Les données (base maître + tenants) sont persistées dans le volume Docker `backend_data`.

> Les données de référence sont dans `deploy-data/` (versionnées dans Git).
> Au premier `docker compose up`, elles sont copiées automatiquement dans le volume Docker.
> Voir [DEPLOY.md](./DEPLOY.md) pour Hostinger et la mise à jour des données.

### Configuration

```bash
cp .env.example .env
# Éditer SECRET_KEY ; laisser SEED_DEMO_ON_START=false pour prod / client
```

### Transférer les vraies données entre machines

```powershell
# Sauvegarde (machine source)
.\scripts\backup-db.ps1

# Restauration (collègue ou serveur)
.\scripts\restore-db.ps1 -ArchivePath "backups\db-XXXX.zip"
```

Voir **[DEPLOY.md](./DEPLOY.md)** pour Hostinger et la checklist production.

### Arrêter

```bash
docker compose down
```

### Voir les logs

```bash
docker compose logs -f backend
```

## Démarrage en développement local

### Backend

```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend : http://localhost:5173 (proxy API vers le port 8000)
