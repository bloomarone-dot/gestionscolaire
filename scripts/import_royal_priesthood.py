#!/usr/bin/env python3
"""Importe la structure Royal Priesthood : école, classes, matières, élèves.

Sans notes ni professeurs. Données extraites des bulletins PDF Doc_RoyalPriestHood.

Usage:
  python3 scripts/import_royal_priesthood.py
  python3 scripts/import_royal_priesthood.py --apply
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import unicodedata
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

API_URL = os.environ.get("EDUGESTION_API_URL", "http://localhost:8082")
DOC_DIR = Path(os.environ.get("ROYAL_DATA_DIR", "/home/tontsa-reine/Downloads/Doc_RoyalPriestHood"))
SCHOOL_NAME = "Royal Priesthood Academy"
SCHOOL_CODE = "RPA"

ROYAL_BULLETIN_PROFILE = {
    "name": "Royal Priesthood International Institute",
    "city": "Yaoundé",
    "address": "Mefou et Afamba",
    "phone": "672314497",
    "bulletin_motto": "a chosen generation",
    "bulletin_po_box": "672314497 / 686810189",
    "bulletin_delegation_regional": "REGIONAL DELEGATION FOR CENTER",
    "bulletin_delegation_departementale": "DIVISIONAL DELEGATION FOR MEFOU AND AFAMBA",
    "bulletin_next_term_note": "",
    "bulletin_theme": {
        "preset": "royal_priesthood",
        "national_header": "#d9ead3",
        "title_bar": "#6fa8dc",
        "identity_label": "#cfe2f3",
        "identity_row": "#eeeeee",
        "grades_header": "#6fa8dc",
        "group_row": "#9fc5e8",
        "grade_row": "#ffffff",
        "summary": "#fce5cd",
        "signatures": "#d9ead3",
        "border": "#000000",
        "text": "#000000",
    },
    "bulletin_appreciation_scales": {
        "fr": [
            {"min": 18, "label": "A+"},
            {"min": 16, "label": "A"},
            {"min": 14, "label": "ECA"},
            {"min": 10, "label": "NA"},
            {"min": 0, "label": "CNA"},
        ],
        "en": [
            {"min": 18, "label": "EXCELLENT"},
            {"min": 16, "label": "A"},
            {"min": 10, "label": "IPA"},
            {"min": 0, "label": "CNA"},
        ],
    },
}

SKIP_SUBJECT = re.compile(
    r"^(SUBJECTS|FIRST GROUP|SECOND GROUP|THIRD GROUP|Premier groupe|Deuxieme groupe|Troisieme groupe|"
    r"TOTAL|TERM AVERAGE|FRANCAIS|LVII|MATIERE|NOM:|NAME:)$",
    re.I,
)
ANGLO_SUBJECT = re.compile(
    r"^\s*([A-Z][A-Z0-9\s\\\/\(\)\-\']+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)",
)
FR_SUBJECT = re.compile(
    r"^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-]+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)",
)
GROUP_MARKERS = {
    "FIRST GROUP": 1, "SECOND GROUP": 2, "THIRD GROUP": 3,
    "Premier groupe": 1, "Deuxieme groupe": 2, "Troisieme groupe": 3,
}

# Clés internes -> libellés affichés (+ sous-système bulletin)
CLASS_DEFS: dict[str, dict] = {
    "anglo/form1": {"nom": "Form 1", "section": "Anglophone", "niveau": "Form 1", "subsystem_code": "ANGLOPHONE"},
    "anglo/form2": {"nom": "Form 2", "section": "Anglophone", "niveau": "Form 2", "subsystem_code": "ANGLOPHONE"},
    "anglo/form3": {"nom": "Form 3", "section": "Anglophone", "niveau": "Form 3", "subsystem_code": "ANGLOPHONE"},
    "anglo/form3tpb": {"nom": "Form 3T/PB", "section": "Anglophone", "niveau": "Form 3 Technical Plumbing", "subsystem_code": "ANGLOPHONE"},
    "anglo/form5_arts": {"nom": "Form 5 Arts", "section": "Anglophone", "niveau": "Form 5 Arts", "subsystem_code": "ANGLOPHONE"},
    "anglo/form5_sciences": {"nom": "Form 5 Sciences", "section": "Anglophone", "niveau": "Form 5 Sciences", "subsystem_code": "ANGLOPHONE"},
    "franco/sixieme": {"nom": "6ème", "section": "Francophone", "niveau": "Sixième", "subsystem_code": "FRANCOPHONE"},
    "franco/cinquieme": {"nom": "5ème", "section": "Francophone", "niveau": "Cinquième", "subsystem_code": "FRANCOPHONE"},
    "franco/quatrieme": {"nom": "4ème", "section": "Francophone", "niveau": "Quatrième", "subsystem_code": "FRANCOPHONE"},
    "franco/troisieme": {"nom": "3ème", "section": "Francophone", "niveau": "Troisième", "subsystem_code": "FRANCOPHONE"},
    "franco/seconde": {"nom": "2nde", "section": "Francophone", "niveau": "Seconde", "subsystem_code": "FRANCOPHONE"},
    "franco/premiere_a": {"nom": "1ère A", "section": "Francophone", "niveau": "Première A", "subsystem_code": "FRANCOPHONE"},
}


def api(method: str, path: str, token: str | None = None, payload=None, school_id: int | None = None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if school_id is not None:
        headers["X-School-Id"] = str(school_id)
    data = json.dumps(payload).encode() if payload is not None else None
    req = Request(f"{API_URL.rstrip('/')}{path}", data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=60) as resp:
            body = resp.read().decode()
            return resp.status, json.loads(body) if body else {}
    except HTTPError as err:
        body = err.read().decode()
        try:
            detail = json.loads(body)
        except json.JSONDecodeError:
            detail = body
        raise RuntimeError(f"{method} {path} -> {err.code}: {detail}") from err


def login(phone: str, password: str) -> str:
    _, data = api("POST", "/auth/login", None, {"phone": phone, "password": password})
    return data["access_token"]


def norm_key(path: str) -> str:
    p = path.lower().replace("\\", "/")
    p = unicodedata.normalize("NFKD", p).encode("ascii", "ignore").decode()
    p = re.sub(r"\s+", " ", p).strip()
    if "sexion anglo" in p:
        if "form 1" in p or "/form1" in p.replace(" ", ""):
            return "anglo/form1"
        if "form2" in p.replace(" ", ""):
            return "anglo/form2"
        if "form3" in p.replace(" ", ""):
            return "anglo/form3"
        if "form5_arts" in p.replace(" ", ""):
            return "anglo/form5_arts"
        if "form5_sciences" in p.replace(" ", ""):
            return "anglo/form5_sciences"
    if "sexion franco" in p:
        if "sixieme" in p or "sixième" in p:
            return "franco/sixieme"
        if "cinquieme" in p or "cinquième" in p:
            return "franco/cinquieme"
        if "quatrieme" in p or "quatrième" in p:
            return "franco/quatrieme"
        if "troisieme" in p or "troisième" in p:
            return "franco/troisieme"
        if "seconde" in p:
            return "franco/seconde"
        if "premiere" in p or "première" in p:
            return "franco/premiere_a"
    return ""


def clean_filename(name: str) -> str:
    name = re.sub(r"\(\d+\)$", "", name.strip())
    name = re.sub(r"\s+\d+[a-z]?$", "", name.strip(), flags=re.I)
    return name.strip()


def split_name(full: str) -> tuple[str, str | None]:
    full = clean_filename(full)
    parts = [p for p in re.split(r"\s+", full) if p]
    if len(parts) <= 1:
        return parts[0].upper() if parts else "INCONNU", None
    if len(parts) == 2:
        return parts[0].upper(), parts[1].title()
    return parts[0].upper(), " ".join(p.title() for p in parts[1:])


def norm_text(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^A-Za-z0-9]+", " ", value).strip().upper()
    return re.sub(r"\s+", " ", value)


def pdf_text(path: Path) -> str:
    proc = subprocess.run(
        ["pdftotext", "-layout", str(path), "-"],
        capture_output=True, text=True, check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"pdftotext failed for {path}")
    return proc.stdout


def extract_student_meta(text: str) -> dict:
    matricule = None
    for pat in (
        r"Matricule:\s*(\d{6,})",
        r"Matricule Unique:\s*(\d{6,})",
        r"Unique ID:\s*(\d{6,})",
        r"UNIQUE ID\s+(RP[\w/-]+)",
        r"ADMISSION NUMBER:\s*(\S+)",
    ):
        m = re.search(pat, text, re.I)
        if m:
            matricule = m.group(1).strip()
            break
    full_name = None
    sexe = None
    for pat in (
        r"NAME:\s+(.+?)\s+CLASS:",
        r"NAME:\s+(.+?)\s+ADMISSION",
        r"NOM:\s+(.+?)\s+Classe:",
    ):
        m = re.search(pat, text, re.I | re.S)
        if m:
            full_name = re.sub(r"\s+", " ", m.group(1)).strip()
            break
    sm = re.search(r"CLASS:[^\n]*\s+([MF])\s*$", text, re.I | re.M)
    if not sm:
        sm = re.search(r"Classe:[^\n]*\s+([MF])\s", text, re.I)
    if sm:
        sexe = sm.group(1).upper()
    return {"matricule": matricule, "full_name": full_name, "sexe": sexe}


def parse_subjects(text: str) -> list[dict]:
    is_anglo = "STUDENT'S PROGRESS REPORT CARD" in text or ("SUBJECTS" in text and "3rd SEQ" in text)
    groupe = 1
    seen: set[str] = set()
    subjects: list[dict] = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped in GROUP_MARKERS:
            groupe = GROUP_MARKERS[stripped]
            continue
        if SKIP_SUBJECT.match(stripped):
            continue
        m = (ANGLO_SUBJECT if is_anglo else FR_SUBJECT).match(line.rstrip())
        if not m:
            continue
        name = re.sub(r"\s+", " ", m.group(1)).strip()
        if len(name) < 3 or norm_text(name) in seen:
            continue
        coef = float(m.group(5))
        if coef > 20:
            continue
        if coef <= 0:
            coef = 1.0
        seen.add(norm_text(name))
        subjects.append({"nom": name, "coefficient": coef, "groupe": groupe})
    return subjects


def collect_from_pdfs() -> tuple[dict[str, list[dict]], dict[str, list[dict]]]:
    """Retourne (élèves par classe, matières par classe) depuis les bulletins PDF."""
    students: dict[str, list[dict]] = {k: [] for k in CLASS_DEFS}
    matieres: dict[str, list[dict]] = {k: [] for k in CLASS_DEFS}
    if not DOC_DIR.is_dir():
        return students, matieres
    for pdf in sorted(DOC_DIR.rglob("*.pdf")):
        rel = pdf.relative_to(DOC_DIR)
        key = norm_key(str(rel.parent))
        if not key:
            continue
        text = pdf_text(pdf)
        meta = extract_student_meta(text)
        nom, prenom = split_name(meta["full_name"] or pdf.stem)
        students[key].append({
            "nom": nom,
            "prenom": prenom,
            "sexe": meta.get("sexe"),
            "matricule": meta.get("matricule"),
            "source": str(rel),
        })
        if not matieres[key]:
            matieres[key] = parse_subjects(text)
    return students, matieres


def build_report(students: dict, matieres: dict) -> dict:
    return {
        "school": SCHOOL_NAME,
        "classes": CLASS_DEFS,
        "students_by_class": {k: v for k, v in students.items() if v},
        "matieres_by_class": {k: v for k, v in matieres.items() if v},
        "totals": {
            "classes": len(CLASS_DEFS),
            "students": sum(len(v) for v in students.values()),
            "matieres": sum(len(v) for v in matieres.values()),
        },
    }


def apply_import(token: str, report: dict) -> dict:
    result = {"steps": []}

    # 1. École
    schools = api("GET", "/tenants/schools", token)[1]
    school = next((s for s in schools if s["name"] == SCHOOL_NAME), None)
    if not school:
        _, school = api("POST", "/tenants/schools", token, {
            "name": SCHOOL_NAME,
            "code": SCHOOL_CODE,
            "city": "Yaoundé",
            "address": "Doc Royal Priesthood",
            "phone": "690000100",
            "subsystems": ["FRANCOPHONE", "ANGLOPHONE"],
            "teaching_types": ["GENERAL", "TECHNIQUE"],
            "channels": ["INTERNAL"],
        })
        result["steps"].append(f"École créée id={school['id']}")
    else:
        result["steps"].append(f"École existante id={school['id']}")
    sid = school["id"]

    api("PUT", f"/tenants/schools/{sid}/profile", token, {
        "subsystems": ["FRANCOPHONE", "ANGLOPHONE"],
        "teaching_types": ["GENERAL", "TECHNIQUE"],
        "channels": ["INTERNAL"],
    }, school_id=sid)

    api("PUT", f"/tenants/schools/{sid}", token, ROYAL_BULLETIN_PROFILE, school_id=sid)
    result["steps"].append("Profil bulletin Royal Priesthood configuré (couleurs, en-tête, barème)")

    # 2. Admin établissement (idempotent si conflit)
    try:
        api("POST", "/auth/accounts", token, {
            "phone": "690000101",
            "password": "RoyalAdmin2026!",
            "first_name": "Admin",
            "last_name": "Royal Priesthood",
            "role": "admin",
            "tenant_id": sid,
        })
        result["steps"].append("Compte admin créé (690000101 / RoyalAdmin2026!)")
    except RuntimeError as exc:
        if "409" in str(exc):
            result["steps"].append("Compte admin déjà existant")
        else:
            raise

    # 3. Année scolaire
    annees = api("GET", "/pedagogie/annees-scolaires", token, school_id=sid)[1]
    annee = next((a for a in annees if a["annee"] == "2025/2026"), None)
    if not annee:
        _, annee = api("POST", "/pedagogie/annees-scolaires", token, {
            "annee": "2025/2026", "is_active": True,
        }, school_id=sid)
        result["steps"].append("Année 2025/2026 créée")
    elif not annee.get("is_active"):
        _, annee = api("PUT", f"/pedagogie/annees-scolaires/{annee['id']}/activer", token, school_id=sid)
    annee_id = annee["id"]

    # 4. Classes
    existing = api("GET", "/pedagogie/classes", token, school_id=sid)[1]
    by_name = {c["nom_personnalise"].lower(): c for c in existing}
    class_ids: dict[str, int] = {}
    for key, meta in CLASS_DEFS.items():
        nom = meta["nom"]
        if nom.lower() in by_name:
            class_ids[key] = by_name[nom.lower()]["id"]
            continue
        _, created = api("POST", "/pedagogie/classes", token, {
            "nom_personnalise": nom,
            "is_special": True,
            "niveau_libre": meta["niveau"],
            "specialite_libre": meta["section"],
            "subsystem_code": meta["subsystem_code"],
            "annee_scolaire_id": annee_id,
        }, school_id=sid)
        class_ids[key] = created["id"]
    for key, meta in CLASS_DEFS.items():
        cid = class_ids.get(key)
        if not cid:
            continue
        api("PUT", f"/pedagogie/classes/{cid}", token, {
            "subsystem_code": meta["subsystem_code"],
        }, school_id=sid)
    result["steps"].append(f"{len(class_ids)} classes prêtes (sections franco/anglo)")

    # 5. Matières par classe (ordre et groupes depuis les bulletins PDF)
    matieres_created = 0
    for class_key, subjects in report.get("matieres_by_class", {}).items():
        cid = class_ids.get(class_key)
        if not cid or not subjects:
            continue
        existing = api("GET", f"/pedagogie/classes/{cid}/matieres", token, school_id=sid)[1]
        by_name = {norm_text(m["nom"]): m for m in existing}
        for subj in subjects:
            key = norm_text(subj["nom"])
            if key in by_name:
                mid = by_name[key]["id"]
                if subj.get("groupe") and by_name[key].get("groupe") != subj["groupe"]:
                    api("PATCH", f"/pedagogie/classes/{cid}/matieres/{mid}", token, {
                        "groupe": subj["groupe"],
                    }, school_id=sid)
                continue
            _, created = api("POST", f"/pedagogie/classes/{cid}/matieres/special", token, {
                "nom": subj["nom"],
                "coefficient": subj["coefficient"],
            }, school_id=sid)
            if subj.get("groupe"):
                api("PATCH", f"/pedagogie/classes/{cid}/matieres/{created['id']}", token, {
                    "groupe": subj["groupe"],
                }, school_id=sid)
            by_name[key] = created
            matieres_created += 1
    result["steps"].append(f"{matieres_created} matières créées")

    # 6. Élèves (noms réels depuis les bulletins PDF)
    existing_eleves = api("GET", "/eleves", token, school_id=sid)[1]
    known_mat = {(e.get("matricule") or "").upper() for e in existing_eleves if e.get("matricule")}
    known_name = {(e["nom"].upper(), (e.get("prenom") or "").upper()) for e in existing_eleves}
    imported = 0
    for class_key, eleves in report["students_by_class"].items():
        cid = class_ids.get(class_key)
        if not cid:
            continue
        for e in eleves:
            mat = (e.get("matricule") or "").upper()
            key = (e["nom"].upper(), (e.get("prenom") or "").upper())
            if (mat and mat in known_mat) or key in known_name:
                continue
            api("POST", "/eleves", token, {
                "nom": e["nom"],
                "prenom": e.get("prenom"),
                "sexe": e.get("sexe"),
                "matricule": e.get("matricule"),
                "classe_id": cid,
                "parents": [],
            }, school_id=sid)
            if mat:
                known_mat.add(mat)
            known_name.add(key)
            imported += 1
    result["steps"].append(f"{imported} élèves importés")
    result["school_id"] = sid
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--phone", default=os.environ.get("SUPERADMIN_PHONE", "690000000"))
    parser.add_argument("--password", default=os.environ.get("SUPERADMIN_PASSWORD", "ChangeMe2026!"))
    parser.add_argument("--output", type=Path, default=ROOT / "scripts/import_royal_priesthood_report.json")
    args = parser.parse_args()

    students, matieres = collect_from_pdfs()
    report = build_report(students, matieres)

    if args.apply:
        token = login(args.phone, args.password)
        report["apply_result"] = apply_import(token, report)

    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Rapport : {args.output}")
    print(
        f"Classes : {report['totals']['classes']} | "
        f"Élèves : {report['totals']['students']} | "
        f"Matières : {report['totals']['matieres']}"
    )
    if args.apply:
        print("Import terminé :", report["apply_result"])
    else:
        print("Dry-run — relancez avec --apply pour importer.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
