-- Création des bases logiques (une par service) sur l'instance Postgres de dev.
-- Exécuté automatiquement par l'image postgres au premier démarrage.
-- Stratégie : 1 conteneur, N bases logiques (cf. ARCHITECTURE.md §1.5).

CREATE DATABASE auth_db;
CREATE DATABASE tenant_db;
CREATE DATABASE referentiel_db;
CREATE DATABASE pedagogie_db;
CREATE DATABASE personnel_db;
CREATE DATABASE eleves_db;
CREATE DATABASE evaluations_db;
CREATE DATABASE bulletins_db;
CREATE DATABASE notifications_db;
