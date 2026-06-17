# Données de référence (versionnées dans Git)

Ces fichiers SQLite sont copiés automatiquement au **premier démarrage** Docker
si le volume `backend_data` est vide.

## Établissements inclus

| ID | Nom | Compte admin |
|----|-----|--------------|
| 1 | Lycée Moderne de Yaoundé (démo) | `admin.lycee` |
| 2 | ROYAL PRIESTHOOD (référence projet) | `ADMIN-p` |

Compte super-admin : `superadmin`

Les mots de passe sont ceux définis lors de la création des comptes (non stockés en clair ici).

## Hostinger — nouveau client

Sur le serveur client, le super-admin (`superadmin`) peut créer un **nouvel établissement**
via l'interface. Les données ci-dessus servent de référence pour l'équipe de développement.

Pour repartir d'une base vide sur Hostinger :

```bash
docker compose down
docker volume rm gestionscolairesaas_backend_data
docker compose exec backend python -m app.db.seed   # superadmin uniquement
```
