"""Bridge legacy → BulletinDataContext (étape 5).

ADAPTATION pure : aucune moyenne / rang / coefficient recalculé ici.
Source de vérité des calculs = ``app.compute.compute_class_bulletins``.

Contrat DataContext (champs réellement mappés depuis le legacy) :

school:
  name, name_fr, logo, po_box, motto,
  delegation_regional, delegation_departementale
  (id école absent du payload bulletin actuel → non inventé)

student:
  id, first_name, last_name, full_name, matricule, gender,
  repeat_status  ← uniquement si présent dans le bulletin (souvent None ;
                   le domaine Élève n'a pas de colonne redoublant fiable)
  photo          ← absent du payload compute → None (pas inventé)

class:
  name, size, level_code, cycle_code (via type? non), series_code,
  subsystem_code, type_code
  id             ← pas dans header legacy → None sauf si fourni en entrée

academic_year:
  name  ← header.school_year (pas d'id AnneeScolaire dans le payload)

term / period:
  name, label, number (trimestre), scope

subjects[] (lignes déjà calculées) :
  id, name, coefficient, groupe, teacher,
  average, points, rank, appreciation,
  grades { <sequence_key|term_avg_*>: valeur | null },
  is_complementary (bool)

summary:
  general_average, class_average, rank, class_size,
  total_points, total_coefficients, decision, observation ("" si absent),
  appreciation_generale

attendance:
  {} si aucune donnée réelle (NE PAS mettre absences="0")

meta:
  lang, scope, trimestre, establishment_kind, seq_keys, source="legacy_compute"
"""
from __future__ import annotations

from typing import Any, Optional

from app.compute import TRIMESTER_SEQS, compute_class_bulletins
from app.engine.context import BulletinDataContext
from app.labels import period_label, seq_types_for


def _full_name(prenom: Optional[str], nom: Optional[str]) -> str:
    return " ".join(p for p in (prenom or "", nom or "") if p).strip()


def _seq_keys_for(scope: str, trimestre: int, establishment_kind: str = "SCHOOL") -> list[str]:
    """Clés stables pour ``grades.*`` — alignées sur les colonnes ``seqs`` du legacy."""
    if scope == "annual":
        # seqs legacy = [moy T1, moy T2, moy T3] (voir compute.subject_period_values)
        return ["term_avg_1", "term_avg_2", "term_avg_3"]
    # Trimestre : sequence_1/2, 3/4 ou 5/6 (TRIMESTER_SEQS / seq_types_for)
    keys = list(seq_types_for(scope, trimestre))
    # Cohérence avec TRIMESTER_SEQS
    expected = list(TRIMESTER_SEQS.get(trimestre, ()))
    if expected and keys != expected:
        return expected
    return keys


def _grades_from_seqs(
    seqs: Optional[list],
    *,
    scope: str,
    trimestre: int,
    establishment_kind: str = "SCHOOL",
) -> dict[str, Any]:
    """Mappe la liste ``seqs`` déjà calculée → dict grades (pas de recalcul)."""
    keys = _seq_keys_for(scope, trimestre, establishment_kind)
    seqs = list(seqs or [])
    grades: dict[str, Any] = {}
    for i, key in enumerate(keys):
        grades[key] = seqs[i] if i < len(seqs) else None
    return grades


def _map_subject_row(
    row: dict[str, Any],
    *,
    scope: str,
    trimestre: int,
    establishment_kind: str,
    complementary: bool = False,
) -> dict[str, Any]:
    """Une ligne matière du bulletin legacy → sujet DataContext."""
    return {
        "id": row.get("matiere_id"),
        "name": row.get("nom"),
        "coefficient": row.get("coefficient"),
        "groupe": row.get("groupe"),  # déjà effectif après compute._partition_subjects
        "teacher": row.get("enseignant_nom"),
        "teacher_id": row.get("enseignant_id"),
        "average": row.get("moyenne"),
        "points": row.get("points"),
        "rank": row.get("rang_matiere"),
        "appreciation": row.get("appreciation"),
        "grades": _grades_from_seqs(
            row.get("seqs"),
            scope=scope,
            trimestre=trimestre,
            establishment_kind=establishment_kind,
        ),
        "is_complementary": complementary,
        "source": "SPECIALE" if complementary else row.get("source"),
    }


def _map_school(header: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": header.get("school_name"),
        "name_fr": header.get("school_name_fr"),
        "logo": header.get("logo_url"),
        "po_box": header.get("po_box"),
        "motto": header.get("motto"),
        "delegation_regional": header.get("delegation_regional"),
        "delegation_departementale": header.get("delegation_departementale"),
        # address / city / phone / id : absents du payload bulletin → non inventés
    }


def _map_student(bulletin: dict[str, Any]) -> dict[str, Any]:
    prenom = bulletin.get("prenom")
    nom = bulletin.get("nom")
    student = {
        "id": bulletin.get("eleve_id"),
        "first_name": prenom,
        "last_name": nom,
        "full_name": _full_name(prenom, nom),
        "matricule": bulletin.get("matricule"),
        "gender": bulletin.get("sexe"),
        # photo : non fourni par compute/service → None explicite
        "photo": None,
    }
    # repeat_status : ne pas inventer ; exposer seulement la valeur legacy si clé présente
    if "redoublant" in bulletin:
        student["repeat_status"] = bulletin.get("redoublant")
    return student


def _map_class(header: dict[str, Any], effectif: Optional[int]) -> dict[str, Any]:
    return {
        "name": header.get("classe"),
        "size": effectif if effectif is not None else header.get("effectif"),
        "level_code": header.get("level_code"),
        "series_code": header.get("series_code"),
        "subsystem_code": header.get("subsystem_code"),
        "type_code": header.get("type_code"),
        # cycle_code absent du header legacy actuel
        "cycle_code": header.get("cycle_code"),
        "prof_principal": header.get("prof_principal"),
    }


def _map_term_period(header: dict[str, Any], trimestre: int, scope: str, lang: str) -> tuple[dict, dict]:
    label = header.get("term") or period_label(scope, trimestre, lang, header.get("establishment_kind"))
    term = {
        "name": label,
        "label": label,
        "number": None if scope == "annual" else trimestre,
        "scope": scope,
    }
    period = dict(term)
    return term, period


def _map_summary(
    bulletin: dict[str, Any],
    *,
    moyenne_classe: Optional[float],
    effectif: Optional[int],
) -> dict[str, Any]:
    return {
        "general_average": bulletin.get("moyenne_generale"),
        "class_average": moyenne_classe,
        "rank": bulletin.get("rang_general"),
        "class_size": effectif,
        "total_points": bulletin.get("total_points"),
        "total_coefficients": bulletin.get("total_coefficient"),
        "decision": bulletin.get("decision") or None,
        "observation": bulletin.get("observation") if "observation" in bulletin else None,
        "appreciation_generale": bulletin.get("appreciation_generale"),
    }


def _map_attendance(header: dict[str, Any], bulletin: dict[str, Any]) -> dict[str, Any]:
    """Pas de domaine absences : retourne {} (pas de faux zéros)."""
    # Si un jour des champs réels existent sur le bulletin, les mapper ici.
    absences = bulletin.get("absences") if isinstance(bulletin, dict) else None
    sanctions = bulletin.get("sanctions") if isinstance(bulletin, dict) else None
    if absences is None and sanctions is None:
        return {}
    out: dict[str, Any] = {}
    if absences is not None:
        out["absences"] = absences
    if sanctions is not None:
        out["sanctions"] = sanctions
    return out


class BulletinDataContextBuilder:
    """Construit un ``BulletinDataContext`` à partir des sorties legacy (mapping only)."""

    @staticmethod
    def from_legacy_eleve_result(payload: dict[str, Any]) -> BulletinDataContext:
        """Depuis le dict retourné par ``service.build_eleve_bulletin`` (sans I/O).

        payload keys : header, moyenne_classe, effectif, lang, bulletin
        """
        if not isinstance(payload, dict):
            raise ValueError("payload legacy invalide")
        if payload.get("error"):
            raise ValueError(payload["error"])
        bulletin = payload.get("bulletin")
        if not bulletin:
            raise ValueError("Bulletin introuvable dans le payload legacy")

        header = payload.get("header") or {}
        lang = payload.get("lang") or "fr"
        scope = header.get("scope") or "trimestre"
        trimestre = int(header.get("trimestre") or 1)
        kind = header.get("establishment_kind") or "SCHOOL"
        effectif = payload.get("effectif")
        if effectif is None:
            effectif = header.get("effectif")
        moyenne_classe = payload.get("moyenne_classe")

        subjects = [
            _map_subject_row(row, scope=scope, trimestre=trimestre, establishment_kind=kind)
            for row in (bulletin.get("subjects") or [])
        ]
        for row in bulletin.get("special_subjects") or []:
            subjects.append(
                _map_subject_row(
                    row, scope=scope, trimestre=trimestre,
                    establishment_kind=kind, complementary=True,
                )
            )

        term, period = _map_term_period(header, trimestre, scope, lang)
        school_year = header.get("school_year")

        return BulletinDataContext.from_mapping({
            "school": _map_school(header),
            "student": _map_student(bulletin),
            "class": _map_class(header, effectif),
            "academic_year": {"name": school_year} if school_year else {},
            "term": term,
            "period": period,
            "subjects": subjects,
            "summary": _map_summary(
                bulletin, moyenne_classe=moyenne_classe, effectif=effectif,
            ),
            "attendance": _map_attendance(header, bulletin),
            "meta": {
                "source": "legacy_compute",
                "lang": lang,
                "scope": scope,
                "trimestre": trimestre,
                "establishment_kind": kind,
                "seq_keys": _seq_keys_for(scope, trimestre, kind),
                "seq_labels": header.get("seq_labels"),
                "report_title": header.get("report_title"),
            },
        })

    @staticmethod
    def from_compute_inputs(
        students: list[dict],
        subjects: list[dict],
        notes: list[dict],
        *,
        eleve_id: int,
        trimestre: int = 1,
        scope: str = "trimestre",
        lang: str = "fr",
        appreciation_scales: dict | None = None,
        establishment_kind: str = "SCHOOL",
        school: dict | None = None,
        classe: dict | None = None,
        header_extra: dict | None = None,
    ) -> BulletinDataContext:
        """Appelle ``compute_class_bulletins`` puis mappe (tests / usage hors HTTP).

        Aucun recalcul dans le builder — uniquement compute + mapping.
        """
        result = compute_class_bulletins(
            students,
            subjects,
            notes,
            lang=lang,
            trimestre=trimestre,
            scope=scope,
            appreciation_scales=appreciation_scales,
            establishment_kind=establishment_kind,
        )
        bulletin = next((b for b in result["bulletins"] if b["eleve_id"] == eleve_id), None)
        if bulletin is None:
            raise ValueError(f"Élève {eleve_id} absent du résultat compute")

        # Décision annuelle : même règle que service.build_class_bulletins
        if scope == "annual":
            from app.labels import decision as decision_fn
            bulletin = {**bulletin, "decision": decision_fn(bulletin.get("moyenne_generale"), lang)}
        else:
            bulletin = {**bulletin, "decision": bulletin.get("decision") or ""}

        school = school or {}
        classe = classe or {}
        header = {
            "school_name": school.get("name") or school.get("school_name") or "",
            "school_name_fr": school.get("name_fr") or school.get("name") or "",
            "logo_url": school.get("logo_url"),
            "po_box": school.get("bulletin_po_box"),
            "motto": school.get("bulletin_motto"),
            "delegation_regional": school.get("bulletin_delegation_regional"),
            "delegation_departementale": school.get("bulletin_delegation_departementale"),
            "school_year": school.get("school_year"),
            "classe": classe.get("nom_personnalise") or classe.get("name"),
            "subsystem_code": classe.get("subsystem_code"),
            "type_code": classe.get("type_code"),
            "level_code": classe.get("level_code"),
            "series_code": classe.get("series_code"),
            "cycle_code": classe.get("cycle_code"),
            "trimestre": trimestre,
            "scope": scope,
            "establishment_kind": establishment_kind,
            "term": period_label(scope, trimestre, lang, establishment_kind),
            "effectif": result.get("effectif"),
            "prof_principal": None,
            "seq_labels": None,
            "report_title": None,
        }
        if header_extra:
            header.update(header_extra)

        payload = {
            "header": header,
            "moyenne_classe": result.get("moyenne_classe"),
            "effectif": result.get("effectif"),
            "lang": result.get("lang") or lang,
            "bulletin": bulletin,
        }
        return BulletinDataContextBuilder.from_legacy_eleve_result(payload)


# Alias court pour imports
build_data_context_from_legacy = BulletinDataContextBuilder.from_legacy_eleve_result
build_data_context_from_compute = BulletinDataContextBuilder.from_compute_inputs
