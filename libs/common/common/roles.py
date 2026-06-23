"""Rôles applicatifs — source unique pour les services Python."""

SUPERADMIN = "superadmin"
ADMIN = "admin"
SECRETAIRE = "secretaire"
DIRECTION = "direction"
ENSEIGNANT = "enseignant"
PARENT = "parent"

# Comptes créables par l'admin d'établissement (hors admin plateforme).
ADMIN_CREATABLE = frozenset({SECRETAIRE, DIRECTION, ENSEIGNANT})

# Lecture / exploitation courante (élèves, classes, notes en lecture…).
ESTABLISHMENT_STAFF = frozenset({ADMIN, SECRETAIRE, DIRECTION, ENSEIGNANT, SUPERADMIN})

# Saisie des notes et bulletins pédagogiques.
GRADES_STAFF = frozenset({ADMIN, DIRECTION, ENSEIGNANT, SUPERADMIN})

# Trésorerie : encaissements, échéances, reçus.
TREASURY_STAFF = frozenset({ADMIN, SECRETAIRE, DIRECTION, SUPERADMIN})

# Planning : salles et emploi du temps.
PLANNING_STAFF = frozenset({ADMIN, SECRETAIRE, DIRECTION, SUPERADMIN})
