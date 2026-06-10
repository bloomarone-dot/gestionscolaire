# Déploiement client (Hostinger / production)

## Données dans Git (`deploy-data/`)

Le dépôt contient une copie de référence des bases SQLite :

| Fichier | Contenu |
|---------|---------|
| `deploy-data/master.db` | Établissements, comptes admin, super-admin |
| `deploy-data/tenants/school_*.db` | Classes, élèves, notes par établissement |

Au **premier** `docker compose up`, si le volume Docker est vide, ces fichiers sont
copiés automatiquement → votre collègue peut se connecter après un simple `git pull`.

Comptes disponibles : voir `deploy-data/README.md` (ex. `ADMIN-p` pour ROYAL PRIESTHOOD).

### Mettre à jour les données dans Git (après modifications en local)

```powershell
.\scripts\backup-db.ps1
# Puis copier vers deploy-data/ et committer
.\scripts\sync-deploy-data.ps1
git add deploy-data/
git commit -m "Mise à jour des données de référence"
git push
```

```bash
./scripts/backup-db.sh
./scripts/sync-deploy-data.sh
```

### Nouveau clone (collègue)

```bash
git clone <repo>
cd GestionScolaireSaaS
cp .env.example .env
docker compose up --build -d
```

Si un ancien volume vide les données, supprimez-le une fois :

```bash
docker compose down
docker volume rm gestionscolairesaas_backend_data
docker compose up --build -d
```

---

## Déploiement Hostinger (VPS)

Prérequis : VPS Hostinger avec Docker et Docker Compose installés.

### Checklist production

- [ ] `.env` créé depuis `.env.example`
- [ ] `SECRET_KEY` = clé longue aléatoire (unique par client)
- [ ] `SEED_DEMO_ON_START=false` (obligatoire)
- [ ] `docker compose up --build -d` (données `deploy-data/` chargées au 1er démarrage)
- [ ] Volume Docker `backend_data` persistant (ne pas le supprimer lors des mises à jour)
- [ ] Super-admin crée l'établissement **client** via l'interface (`/superadmin`)
- [ ] Ne **jamais** exécuter `python -m app.db.demo_seed` sur le serveur client

### Nouvel établissement client sur Hostinger

1. Connexion super-admin (`superadmin` + mot de passe équipe)
2. Créer l'établissement du client dans l'interface
3. Créer le compte admin de l'établissement
4. Le client se connecte avec ses propres identifiants (onglet Admin)

### Commandes VPS

```bash
git pull
docker compose up --build -d
```

### Sauvegarde automatique (cron recommandé)

```bash
# Exemple : tous les jours à 2h
0 2 * * * cd /chemin/GestionScolaireSaaS && ./scripts/backup-db.sh
```

Copier les archives `backups/` hors du serveur (stockage externe).

### Mise à jour sans perdre les données

```bash
git pull
docker compose up --build -d
```

Le volume `backend_data` conserve `master.db` et `tenants/`. Les mises à jour de code ne touchent pas aux données tant que le volume n'est pas supprimé.

**Ne pas exécuter** `docker compose down -v` en production (le `-v` supprime le volume et donc toutes les données).

---

## Connexion professeur

Onglet **Professeur** → sélectionner l'**établissement** dans la liste → identifiant / mot de passe.

Sans établissement sélectionné, la connexion échoue même avec de bons identifiants.

---

## Comptes démo (développement uniquement)

Uniquement si vous voulez tester sans vraies données, sur une machine vide :

```env
SEED_DEMO_ON_START=true
```

Puis redémarrer le backend, ou :

```bash
docker compose exec backend python -m app.db.demo_seed
```

**Ne jamais activer en production client.**
