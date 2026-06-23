"""Tests planning-service — salles, séances, conflits."""
from datetime import time

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from common.db import Base
from app import crud
from app.schemas import SalleCreate, SeanceCreate

TENANT = 3


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def test_salle_and_seance(db):
    salle = crud.create_salle(db, TENANT, SalleCreate(nom="Salle A1", capacite=20))
    seance = crud.create_seance(
        db,
        TENANT,
        SeanceCreate(
            jour_semaine=0,
            heure_debut=time(8, 0),
            heure_fin=time(10, 0),
            classe_id=5,
            classe_nom="Groupe A1",
            salle_id=salle.id,
            salle_nom=salle.nom,
            matiere_label="Allemand",
        ),
    )
    assert seance.salle_id == salle.id
    rows = crud.list_seances(db, TENANT, classe_id=5)
    assert len(rows) == 1


def test_salle_conflict(db):
    salle = crud.create_salle(db, TENANT, SalleCreate(nom="Salle B", capacite=15))
    crud.create_seance(
        db,
        TENANT,
        SeanceCreate(
            jour_semaine=1,
            heure_debut=time(14, 0),
            heure_fin=time(16, 0),
            salle_id=salle.id,
        ),
    )
    with pytest.raises(ValueError, match="Conflit"):
        crud.create_seance(
            db,
            TENANT,
            SeanceCreate(
                jour_semaine=1,
                heure_debut=time(15, 0),
                heure_fin=time(17, 0),
                salle_id=salle.id,
            ),
        )


def test_semaine_grouping(db):
    crud.create_seance(
        db,
        TENANT,
        SeanceCreate(jour_semaine=2, heure_debut=time(9, 0), heure_fin=time(11, 0), classe_nom="B1"),
    )
    crud.create_seance(
        db,
        TENANT,
        SeanceCreate(jour_semaine=0, heure_debut=time(8, 0), heure_fin=time(9, 0), classe_nom="A1"),
    )
    week = crud.semaine(db, TENANT)
    assert len(week[0]) == 1
    assert len(week[2]) == 1
