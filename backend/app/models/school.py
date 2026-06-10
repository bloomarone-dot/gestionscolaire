from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Date
from sqlalchemy.orm import relationship
from app.db.connection import Base
from datetime import datetime


# ════════════════════════════════════════════════════════════
# MODÈLES SUPERADMIN — Base de données maître
# ════════════════════════════════════════════════════════════

class School(Base):
    """Métadonnées des établissements — stocké dans la BD maître"""
    __tablename__ = "schools"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20), nullable=False)
    address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    postal_code = Column(String(10), nullable=False)
    
    # Informations de connexion à la BD
    db_host = Column(String(255), default="localhost")
    db_port = Column(Integer, default=1433)  # Port défaut SQL Server
    db_name = Column(String(100), unique=True)  # school_[id]
    db_username = Column(String(100))
    db_password = Column(String(255))
    
    # Directeur de l'établissement (identité distincte de l'admin IT)
    directeur_first_name = Column(String(100), nullable=True)
    directeur_last_name = Column(String(100), nullable=True)
    directeur_email = Column(String(100), nullable=True)
    directeur_phone = Column(String(20), nullable=True)

    # Métadonnées
    admin_id = Column(Integer, ForeignKey("admins.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    admin = relationship("Admin", foreign_keys=[admin_id], uselist=False)


class Admin(Base):
    """Administrateurs des établissements"""
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True)
    hashed_password = Column(String(255))
    first_name = Column(String(100))
    last_name = Column(String(100))
    
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)
    role = Column(String(20), default="admin")  # "superadmin" ou "admin"
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    school = relationship("School", foreign_keys=[school_id], uselist=False)


class ActivityLog(Base):
    """Logs des activités pour audit"""
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("admins.id"))
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)
    action = Column(String(255))  # "created_school", "updated_school", etc.
    description = Column(String(500))
    timestamp = Column(DateTime, default=datetime.utcnow)


# ════════════════════════════════════════════════════════════
# MODÈLES TENANT — Pour chaque établissement (dans son schema)
# ════════════════════════════════════════════════════════════

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(100))
    role = Column(String(20)) # "admin" ou "professeur"


# ════════════════════════════════════════════════════════════
# MODÈLES TENANT — Tenant-specific (école_X schema)
# ════════════════════════════════════════════════════════════

class AnneeScolaire(Base):
    """Années scolaires avec trimestres"""
    __tablename__ = "annees_scolaires"
    
    id = Column(Integer, primary_key=True, index=True)
    annee = Column(String(20), nullable=False)  # Ex: "2023-2024"
    date_debut = Column(DateTime, nullable=False)
    date_fin = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    classes = relationship("Classe", back_populates="annee_scolaire")


class Classe(Base):
    """Classes/groupes d'élèves"""
    __tablename__ = "classes"
    
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(50), nullable=False)  # Ex: "6A", "1ère S", "3B"
    niveau = Column(String(50), nullable=False)  # Ex: "6ème", "1ère", "3ème"
    annee_scolaire_id = Column(Integer, ForeignKey("annees_scolaires.id"))
    
    # Métadonnées
    capacite = Column(Integer, default=30)
    salle = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    annee_scolaire = relationship("AnneeScolaire", back_populates="classes")
    eleves = relationship("Eleve", back_populates="classe")
    attributions = relationship("AttributionProfesseur", back_populates="classe")
    emploi_temps = relationship("EmploiTemps", back_populates="classe")


class Matiere(Base):
    """Matières scolaires"""
    __tablename__ = "matieres"
    
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)  # Ex: "Mathématiques"
    code = Column(String(20), unique=True)  # Ex: "MATH"
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    professeurs = relationship("AttributionProfesseur", back_populates="matiere")
    notes = relationship("Note", back_populates="matiere")
    emploi_temps = relationship("EmploiTemps", back_populates="matiere")


class Professeur(Base):
    """Professeurs/Enseignants"""
    __tablename__ = "professeurs"
    
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20), nullable=True)
    specialite = Column(String(100), nullable=True)  # Ex: "Mathématiques"
    
    # Identifiants
    matricule = Column(String(50), unique=True, nullable=False)
    
    # Compte utilisateur
    username = Column(String(50), unique=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)
    
    # Métadonnées
    is_active = Column(Boolean, default=True)
    date_creation = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    attributions = relationship("AttributionProfesseur", back_populates="professeur")
    notes = relationship("Note", back_populates="professeur")
    emploi_temps = relationship("EmploiTemps", back_populates="professeur")


class AttributionProfesseur(Base):
    """Attribution d'un professeur à une classe/matière"""
    __tablename__ = "attributions_professeurs"
    
    id = Column(Integer, primary_key=True, index=True)
    professeur_id = Column(Integer, ForeignKey("professeurs.id"), nullable=False)
    classe_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    matiere_id = Column(Integer, ForeignKey("matieres.id"), nullable=False)
    
    # Métadonnées
    date_debut = Column(DateTime, default=datetime.utcnow)
    date_fin = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Relations
    professeur = relationship("Professeur", back_populates="attributions")
    classe = relationship("Classe", back_populates="attributions")
    matiere = relationship("Matiere", back_populates="professeurs")


class Eleve(Base):
    __tablename__ = "eleves"
    
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=False)
    matricule = Column(String(50), unique=True, nullable=False)
    
    # Classe
    classe_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    
    # Métadonnées
    date_inscription = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    classe = relationship("Classe", back_populates="eleves")
    notes = relationship("Note", back_populates="eleve")


class Note(Base):
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    eleve_id = Column(Integer, ForeignKey("eleves.id"), nullable=False)
    matiere_id = Column(Integer, ForeignKey("matieres.id"), nullable=False)
    professeur_id = Column(Integer, ForeignKey("professeurs.id"), nullable=False)
    
    # Note
    valeur = Column(Float, nullable=False)
    coefficient = Column(Float, default=1.0)
    
    # Métadonnées
    date_creation = Column(DateTime, default=datetime.utcnow)
    date_saisie = Column(DateTime, default=datetime.utcnow)
    description = Column(String(255), nullable=True)
    
    # Relations
    eleve = relationship("Eleve", back_populates="notes")
    matiere = relationship("Matiere", back_populates="notes")
    professeur = relationship("Professeur", back_populates="notes")


class PeriodeSaisieNotes(Base):
    """Période autorisée pour la saisie/modification des notes"""
    __tablename__ = "periodes_saisie_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    classe_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    matiere_id = Column(Integer, ForeignKey("matieres.id"), nullable=False)
    
    date_debut = Column(Date, nullable=False)
    date_fin = Column(Date, nullable=False)
    
    justification_autorisee = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmploiTemps(Base):
    """Emploi du temps"""
    __tablename__ = "emploi_temps"
    
    id = Column(Integer, primary_key=True, index=True)
    classe_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    matiere_id = Column(Integer, ForeignKey("matieres.id"), nullable=False)
    professeur_id = Column(Integer, ForeignKey("professeurs.id"), nullable=False)
    
    # Horaires
    jour = Column(String(20), nullable=False)  # "Lundi", "Mardi", etc.
    heure_debut = Column(String(5), nullable=False)  # "09:00"
    heure_fin = Column(String(5), nullable=False)  # "10:00"
    salle = Column(String(100), nullable=True)
    
    # Relations
    classe = relationship("Classe", back_populates="emploi_temps")
    matiere = relationship("Matiere", back_populates="emploi_temps")
    professeur = relationship("Professeur", back_populates="emploi_temps")


class Bulletin(Base):
    """Bulletins de notes"""
    __tablename__ = "bulletins"
    
    id = Column(Integer, primary_key=True, index=True)
    eleve_id = Column(Integer, ForeignKey("eleves.id"), nullable=False)
    classe_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    annee_scolaire_id = Column(Integer, ForeignKey("annees_scolaires.id"), nullable=False)
    
    # Résultats
    moyenne_generale = Column(Float, default=0)
    rang = Column(Integer, nullable=True)
    appreciation = Column(String(500), nullable=True)
    
    # Métadonnées
    date_generation = Column(DateTime, default=datetime.utcnow)
    is_printed = Column(Boolean, default=False)
    
    # Relations
    eleve = relationship("Eleve")
    classe = relationship("Classe")
    annee_scolaire = relationship("AnneeScolaire")