"""
Jeu de données de démonstration pour tester tous les tableaux de bord.
Usage: python -m app.db.demo_seed
       python -m app.db.demo_seed --force   # réinitialise l'établissement démo
"""
import argparse
import logging
from datetime import date, datetime, timedelta

from app.auth.security import hash_password
from app.db.connection import SessionLocal, engine
from app.db.multi_tenant import tenant_manager
from app.db.tenant_tables import create_master_tables
from app.models.school import (
    ActivityLog,
    Admin,
    AnneeScolaire,
    AttributionProfesseur,
    Classe,
    Eleve,
    Matiere,
    Note,
    PeriodeSaisieNotes,
    Professeur,
    School,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEMO_SCHOOL_NAME = "Lycée Moderne de Yaoundé"

ACCOUNTS = {
    "superadmin": {
        "username": "superadmin",
        "email": "superadmin@edusaas.fr",
        "password": "EduSaaS2026!",
        "first_name": "Super",
        "last_name": "Administrateur",
    },
    "admin": {
        "username": "admin.lycee",
        "email": "admin@lycee-yaounde.cm",
        "password": "Admin2026!",
        "first_name": "Marie",
        "last_name": "Nkodo",
    },
    "professeur": {
        "username": "prof.dupont",
        "email": "dupont@lycee-yaounde.cm",
        "password": "Prof2026!",
        "nom": "Dupont",
        "prenom": "Jean",
        "matricule": "PROF-001",
        "specialite": "Mathématiques",
    },
}


def _ensure_superadmin(db) -> Admin:
    existing = db.query(Admin).filter(Admin.role == "superadmin").first()
    if existing:
        logger.info("Super-admin déjà présent : %s", existing.username)
        return existing

    data = ACCOUNTS["superadmin"]
    superadmin = Admin(
        username=data["username"],
        email=data["email"],
        hashed_password=hash_password(data["password"]),
        first_name=data["first_name"],
        last_name=data["last_name"],
        role="superadmin",
        is_active=True,
    )
    db.add(superadmin)
    db.commit()
    db.refresh(superadmin)
    logger.info("Super-admin créé : %s", data["username"])
    return superadmin


def _delete_demo_school(db, school: School) -> None:
    tenant_manager.delete_tenant(school)
    db.query(ActivityLog).filter(ActivityLog.school_id == school.id).delete()
    admin = db.query(Admin).filter(Admin.id == school.admin_id).first()
    db.delete(school)
    if admin:
        db.delete(admin)
    db.commit()


def _create_demo_school(db) -> School:
    existing = db.query(School).filter(School.name == DEMO_SCHOOL_NAME).first()
    if existing:
        return existing

    admin_data = ACCOUNTS["admin"]
    admin = Admin(
        username=admin_data["username"],
        email=admin_data["email"],
        hashed_password=hash_password(admin_data["password"]),
        first_name=admin_data["first_name"],
        last_name=admin_data["last_name"],
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.flush()

    school = School(
        name=DEMO_SCHOOL_NAME,
        email="contact@lycee-yaounde.cm",
        phone="+237 6 99 00 11 22",
        address="Avenue Kennedy, Ekounou",
        city="Yaoundé",
        postal_code="00237",
        directeur_first_name="Paul",
        directeur_last_name="Abega",
        directeur_email="directeur@lycee-yaounde.cm",
        directeur_phone="+237 6 77 88 99 00",
        admin_id=admin.id,
        is_active=True,
    )
    db.add(school)
    db.flush()

    school.db_name = f"school_{school.id}"
    admin.school_id = school.id

    if not tenant_manager.provision_tenant(school):
        db.rollback()
        raise RuntimeError("Échec du provisioning de la base tenant.")

    log = ActivityLog(
        admin_id=admin.id,
        school_id=school.id,
        action="created_school",
        description=f"Établissement démo créé : {school.name}",
    )
    db.add(log)
    db.commit()
    db.refresh(school)
    logger.info("Établissement créé : %s (id=%s)", school.name, school.id)
    return school


def _seed_tenant_data(school: School) -> None:
    tenant_db = tenant_manager.open_tenant_session(school)
    try:
        if tenant_db.query(Classe).count() > 0:
            logger.info("Données tenant déjà présentes, skip.")
            return

        now = datetime.utcnow()
        annee = AnneeScolaire(
            annee="2025-2026",
            date_debut=datetime(2025, 9, 1),
            date_fin=datetime(2026, 6, 30),
            is_active=True,
        )
        tenant_db.add(annee)
        tenant_db.flush()

        classe = Classe(
            nom="6ème A",
            niveau="6ème",
            annee_scolaire_id=annee.id,
            capacite=35,
            salle="Salle 12",
        )
        tenant_db.add(classe)
        tenant_db.flush()

        maths = Matiere(nom="Mathématiques", code="MATH", description="Algèbre et géométrie")
        francais = Matiere(nom="Français", code="FR", description="Grammaire et littérature")
        tenant_db.add_all([maths, francais])
        tenant_db.flush()

        prof_data = ACCOUNTS["professeur"]
        professeur = Professeur(
            nom=prof_data["nom"],
            prenom=prof_data["prenom"],
            email=prof_data["email"],
            phone="+237 6 55 44 33 22",
            specialite=prof_data["specialite"],
            matricule=prof_data["matricule"],
            username=prof_data["username"],
            hashed_password=hash_password(prof_data["password"]),
            is_active=True,
        )
        tenant_db.add(professeur)
        tenant_db.flush()

        tenant_db.add(
            AttributionProfesseur(
                professeur_id=professeur.id,
                classe_id=classe.id,
                matiere_id=maths.id,
                is_active=True,
            )
        )

        eleves_data = [
            ("Nkoulou", "Samuel", "ELV-001"),
            ("Fouda", "Clarisse", "ELV-002"),
            ("Manga", "Eric", "ELV-003"),
            ("Tchinda", "Grace", "ELV-004"),
            ("Njoya", "Kevin", "ELV-005"),
        ]
        eleves = []
        for nom, prenom, matricule in eleves_data:
            eleve = Eleve(nom=nom, prenom=prenom, matricule=matricule, classe_id=classe.id)
            tenant_db.add(eleve)
            eleves.append(eleve)
        tenant_db.flush()

        tenant_db.add(
            PeriodeSaisieNotes(
                classe_id=classe.id,
                matiere_id=maths.id,
                date_debut=date.today() - timedelta(days=7),
                date_fin=date.today() + timedelta(days=30),
                justification_autorisee=False,
            )
        )

        demo_notes = [
            ("sequence_1", 14.5, 1.0),
            ("sequence_1", 11.0, 1.0),
            ("sequence_2", 15.0, 2.0),
            ("sequence_2", 12.5, 2.0),
            ("trimestre", 14.75, 1.0),
            ("trimestre", 11.5, 1.0),
        ]
        for i, eleve in enumerate(eleves[:2]):
            for type_eval, valeur, coef in demo_notes[i * 3 : i * 3 + 3]:
                tenant_db.add(
                    Note(
                        eleve_id=eleve.id,
                        matiere_id=maths.id,
                        professeur_id=professeur.id,
                        trimestre=1,
                        type_evaluation=type_eval,
                        valeur=valeur if eleve.matricule != "ELV-002" or type_eval != "sequence_1" else 11.0,
                        coefficient=coef,
                        description=f"Trimestre 1 — {type_eval}",
                        date_creation=now,
                        date_saisie=now,
                    )
                )

        tenant_db.commit()
        logger.info(
            "Données tenant : 1 classe, 2 matières, 1 prof, 5 élèves, 3 notes, 1 période ouverte."
        )
    except Exception:
        tenant_db.rollback()
        raise
    finally:
        tenant_db.close()


def _print_credentials(school: School) -> None:
    sep = "=" * 56
    print(f"\n{sep}")
    print("  COMPTES DE DÉMONSTRATION — EduSaaS")
    print(sep)
    print("\n  SUPER ADMIN (onglet Admin à la connexion)")
    print(f"    Username : {ACCOUNTS['superadmin']['username']}")
    print(f"    Password : {ACCOUNTS['superadmin']['password']}")
    print(f"    URL      : http://localhost:5173  →  /superadmin")
    print("\n  ADMIN ÉTABLISSEMENT")
    print(f"    Établissement : {school.name}")
    print(f"    School ID     : {school.id}")
    print(f"    Username      : {ACCOUNTS['admin']['username']}")
    print(f"    Password      : {ACCOUNTS['admin']['password']}")
    print(f"    URL           : http://localhost:5173  →  /admin")
    print("\n  PROFESSEUR (onglet Professeur à la connexion)")
    print(f"    Établissement : {school.name} (id {school.id})")
    print(f"    Username      : {ACCOUNTS['professeur']['username']}")
    print(f"    Password      : {ACCOUNTS['professeur']['password']}")
    print(f"    URL           : http://localhost:5173  →  /professor")
    print(f"\n{sep}\n")


def run_demo_seed(force: bool = False) -> None:
    create_master_tables(engine)
    db = SessionLocal()
    try:
        _ensure_superadmin(db)

        existing = db.query(School).filter(School.name == DEMO_SCHOOL_NAME).first()
        if existing and force:
            logger.info("Suppression de l'établissement démo existant...")
            _delete_demo_school(db, existing)

        school = _create_demo_school(db)
        _seed_tenant_data(school)
        _print_credentials(school)
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed démo EduSaaS")
    parser.add_argument("--force", action="store_true", help="Réinitialiser l'établissement démo")
    args = parser.parse_args()
    run_demo_seed(force=args.force)
