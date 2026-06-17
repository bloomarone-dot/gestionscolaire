#!/usr/bin/env python3
"""Importe les notes depuis les bulletins PDF Doc_RoyalPriestHood.

Usage:
  python3 scripts/import_royal_priesthood_notes.py
  python3 scripts/import_royal_priesthood_notes.py --apply
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
from import_royal_priesthood import (  # noqa: E402
    CLASS_DEFS,
    DOC_DIR,
    SCHOOL_NAME,
    norm_key,
    split_name,
)

API_URL = os.environ.get("EDUGESTION_API_URL", "http://localhost:8082")
SCHOOL_ID = int(os.environ.get("ROYAL_SCHOOL_ID", "2"))
ADMIN_PHONE = os.environ.get("ROYAL_ADMIN_PHONE", "690000101")
ADMIN_PASSWORD = os.environ.get("ROYAL_ADMIN_PASSWORD", "RoyalAdmin2026!")

SKIP_LINE = re.compile(
    r"^(SUBJECTS|FIRST GROUP|SECOND GROUP|THIRD GROUP|Premier groupe|Deuxieme groupe|Troisieme groupe|"
    r"TOTAL|TERM AVERAGE|POSITION|CLASS AVERAGE|OBSERVATION|PARENTS|NEXT TERM|"
    r"Moyenne trimestrielle|Rang|BULLETIN|FRANCAIS|LVII|MATIERE|NOM:|NAME:)$",
    re.I,
)
ANGLO_GRADE = re.compile(
    r"^\s*([A-Z][A-Z0-9\s\\\/\(\)\-\']+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)",
)
FR_GRADE = re.compile(
    r"^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)",
)


def api(method: str, path: str, token: str | None = None, payload=None, school_id: int | None = None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if school_id is not None:
        headers["X-School-Id"] = str(school_id)
    data = json.dumps(payload).encode() if payload is not None else None
    req = Request(f"{API_URL.rstrip('/')}{path}", data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=120) as resp:
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


def norm_text(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^A-Za-z0-9]+", " ", value).strip().upper()
    return re.sub(r"\s+", " ", value)


def pdf_text(path: Path) -> str:
    proc = subprocess.run(
        ["pdftotext", "-layout", str(path), "-"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"pdftotext failed for {path}: {proc.stderr}")
    return proc.stdout


def detect_trimestre(text: str) -> int:
    if re.search(r"2\s*(?:ND|e|ème|EME)\s*TERM", text, re.I):
        return 2
    if re.search(r"TRIMESTRE[^\n]{0,40}\b2e\b", text, re.I):
        return 2
    if re.search(r"1\s*(?:ST|er|ERE|ÈRE)\s*TERM", text, re.I):
        return 1
    if re.search(r"TRIMESTRE[^\n]{0,40}\b1(?:er|ere|ère)\b", text, re.I):
        return 1
    if re.search(r"3\s*(?:RD|e|ème|EME)\s*TERM", text, re.I):
        return 3
    return 2


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
            val = m.group(1).strip()
            if val and val.lower() not in {"unique", "id"}:
                matricule = val
                break

    full_name = None
    for pat in (
        r"NAME:\s+(.+?)\s+CLASS:",
        r"NAME:\s+(.+?)\s+ADMISSION",
        r"NOM:\s+(.+?)\s+Classe:",
    ):
        m = re.search(pat, text, re.I | re.S)
        if m:
            full_name = re.sub(r"\s+", " ", m.group(1)).strip()
            break
    return {"matricule": matricule, "full_name": full_name}


def parse_grades(text: str) -> list[dict]:
    is_anglo = "STUDENT'S PROGRESS REPORT CARD" in text or "SUBJECTS" in text and "3rd SEQ" in text
    grades: list[dict] = []
    for line in text.splitlines():
        line = line.rstrip()
        if not line.strip():
            continue
        if SKIP_LINE.match(line.strip()):
            continue
        m = ANGLO_GRADE.match(line) if is_anglo else FR_GRADE.match(line)
        if not m:
            continue
        subject = re.sub(r"\s+", " ", m.group(1)).strip()
        if len(subject) < 3:
            continue
        seq3, seq4, avg, coef = (float(m.group(i)) for i in range(2, 6))
        if seq3 > 20 or seq4 > 20:
            continue
        if coef <= 0:
            coef = 1.0
        grades.append({
            "subject": subject,
            "sequence_3": seq3,
            "sequence_4": seq4,
            "average": avg,
            "coefficient": coef,
        })
    return grades


def name_tokens(full_name: str | None) -> set[str]:
    if not full_name:
        return set()
    return {t for t in norm_text(full_name).split() if len(t) > 1}


def match_eleve(
    eleves: list[dict],
    matricule: str | None,
    full_name: str | None,
    class_id: int,
    pdf_stem: str | None = None,
) -> dict | None:
    in_class = [e for e in eleves if e.get("classe_id") == class_id]
    if matricule:
        for e in in_class:
            if (e.get("matricule") or "").upper() == matricule.upper():
                return e

    tokens = name_tokens(full_name)
    if pdf_stem:
        tokens |= name_tokens(clean_stem(pdf_stem))

    if not tokens:
        return None

    best = None
    best_score = 0
    for e in in_class:
        et = name_tokens(f"{e.get('nom', '')} {e.get('prenom') or ''}")
        overlap = len(tokens & et)
        nom = norm_text(e.get("nom", ""))
        full = norm_text(full_name or "")
        if nom and nom in tokens:
            overlap = max(overlap, 2)
        if nom and full and (nom in full or full.startswith(nom) or nom.startswith(full[: max(len(nom), 4)])):
            overlap = max(overlap, 2)
        if pdf_stem:
            stem = norm_text(clean_stem(pdf_stem))
            if stem and full and (stem in full or full.startswith(stem) or stem.startswith(nom[:4])):
                overlap = max(overlap, 2)
        if overlap > best_score:
            best_score = overlap
            best = e
    return best if best_score > 0 else None


def clean_stem(stem: str) -> str:
    stem = re.sub(r"\(\d+\)", "", stem)
    stem = re.sub(r"\s+\d+[a-z]?$", "", stem, flags=re.I)
    return stem.replace("_", " ")


def parse_all_pdfs() -> list[dict]:
    rows = []
    if not DOC_DIR.is_dir():
        return rows
    for pdf in sorted(DOC_DIR.rglob("*.pdf")):
        rel = pdf.relative_to(DOC_DIR)
        class_key = norm_key(str(rel.parent))
        if not class_key:
            continue
        text = pdf_text(pdf)
        meta = extract_student_meta(text)
        grades = parse_grades(text)
        trimestre = detect_trimestre(text)
        rows.append({
            "pdf": str(rel),
            "pdf_stem": pdf.stem,
            "class_key": class_key,
            "class_name": CLASS_DEFS[class_key]["nom"],
            "matricule": meta["matricule"],
            "full_name": meta["full_name"],
            "trimestre": trimestre,
            "grades": grades,
        })
    return rows


def reset_notes(token: str) -> int:
    sid = SCHOOL_ID
    notes = api("GET", "/evaluations/notes", token, school_id=sid)[1]
    deleted = 0
    for n in notes:
        try:
            api("DELETE", f"/evaluations/notes/{n['id']}", token, school_id=sid)
            deleted += 1
        except RuntimeError:
            pass
    return deleted


def ensure_eleve(token: str, eleves: list[dict], class_id: int, row: dict) -> dict | None:
    """Crée ou met à jour l'élève à partir du bulletin PDF."""
    eleve = match_eleve(eleves, row.get("matricule"), row.get("full_name"), class_id, row.get("pdf_stem"))
    if eleve:
        nom, prenom = split_name(row.get("full_name") or eleve.get("nom", ""))
        payload = {}
        if nom and norm_text(nom) != norm_text(eleve.get("nom", "")):
            payload["nom"] = nom
        if prenom and norm_text(prenom or "") != norm_text(eleve.get("prenom") or ""):
            payload["prenom"] = prenom
        if row.get("matricule") and (eleve.get("matricule") or "") != row["matricule"]:
            payload["matricule"] = row["matricule"]
        if payload:
            _, updated = api("PUT", f"/eleves/{eleve['id']}", token, payload, school_id=SCHOOL_ID)
            eleve = updated
        return eleve

    if not row.get("full_name"):
        return None
    nom, prenom = split_name(row["full_name"])
    _, created = api("POST", "/eleves", token, {
        "nom": nom,
        "prenom": prenom,
        "matricule": row.get("matricule"),
        "classe_id": class_id,
        "parents": [],
    }, school_id=SCHOOL_ID)
    eleves.append(created)
    return created


def apply_notes(token: str, parsed: list[dict], *, reset: bool = False) -> dict:
    sid = SCHOOL_ID
    stats = {
        "pdfs": len(parsed),
        "students_matched": 0,
        "students_unmatched": [],
        "notes_created": 0,
        "notes_deleted": reset_notes(token) if reset else 0,
        "errors": [],
    }
    classes = api("GET", "/pedagogie/classes", token, school_id=sid)[1]
    class_by_name = {c["nom_personnalise"].lower(): c for c in classes}
    eleves = api("GET", "/eleves", token, school_id=sid)[1]

    matieres_cache: dict[int, list[dict]] = {}
    matiere_index: dict[int, dict[str, int]] = {}

    def load_matieres(class_id: int) -> None:
        if class_id in matieres_cache:
            return
        mats = api("GET", f"/pedagogie/classes/{class_id}/matieres", token, school_id=sid)[1]
        matieres_cache[class_id] = mats
        matiere_index[class_id] = {norm_text(m["nom"]): m["id"] for m in mats}

    def get_or_create_matiere(class_id: int, subject: str, coef: float) -> int:
        load_matieres(class_id)
        key = norm_text(subject)
        if key in matiere_index[class_id]:
            return matiere_index[class_id][key]
        _, created = api("POST", f"/pedagogie/classes/{class_id}/matieres/special", token, {
            "nom": subject.title() if subject.isupper() else subject,
            "coefficient": coef,
        }, school_id=sid)
        matieres_cache[class_id].append(created)
        matiere_index[class_id][key] = created["id"]
        return created["id"]

    def seq_types(trimestre: int) -> tuple[str, str]:
        base = (trimestre - 1) * 2 + 1
        return f"sequence_{base}", f"sequence_{base + 1}"

    # Regrouper les notes par classe/matière/séquence pour bulk
    bulk_map: dict[tuple, list[dict]] = {}

    for row in parsed:
        cls = class_by_name.get(row["class_name"].lower())
        if not cls:
            stats["errors"].append(f"{row['pdf']}: classe « {row['class_name']} » introuvable")
            continue
        eleve = ensure_eleve(token, eleves, cls["id"], row)
        if not eleve:
            stats["students_unmatched"].append({
                "pdf": row["pdf"],
                "name": row["full_name"],
                "matricule": row["matricule"],
                "class": row["class_name"],
            })
            continue
        stats["students_matched"] += 1
        trimestre = row["trimestre"]
        seq1, seq2 = seq_types(trimestre)
        for g in row["grades"]:
            try:
                matiere_id = get_or_create_matiere(cls["id"], g["subject"], g["coefficient"])
            except RuntimeError as exc:
                stats["errors"].append(f"{row['pdf']} / {g['subject']}: {exc}")
                continue
            for seq_type, value in ((seq1, g["sequence_3"]), (seq2, g["sequence_4"])):
                key = (cls["id"], matiere_id, trimestre, seq_type)
                bulk_map.setdefault(key, []).append({"eleve_id": eleve["id"], "valeur": value})

    for (class_id, matiere_id, trimestre, seq_type), notes in bulk_map.items():
        try:
            api("POST", "/evaluations/notes/bulk", token, {
                "classe_id": class_id,
                "matiere_id": matiere_id,
                "trimestre": trimestre,
                "type_evaluation": seq_type,
                "notes": notes,
            }, school_id=sid)
            stats["notes_created"] += len(notes)
        except RuntimeError as exc:
            stats["errors"].append(f"bulk class={class_id} matiere={matiere_id} {seq_type}: {exc}")

    return stats


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--reset", action="store_true", help="Supprime toutes les notes avant réimport.")
    parser.add_argument("--output", type=Path, default=ROOT / "scripts/import_royal_priesthood_notes_report.json")
    args = parser.parse_args()

    parsed = parse_all_pdfs()
    report = {
        "school_id": SCHOOL_ID,
        "school": SCHOOL_NAME,
        "bulletins": parsed,
        "summary": {
            "pdfs": len(parsed),
            "grades_total": sum(len(p["grades"]) for p in parsed),
        },
    }

    if args.apply:
        token = login(ADMIN_PHONE, ADMIN_PASSWORD)
        report["apply_result"] = apply_notes(token, parsed, reset=args.reset)

    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Rapport : {args.output}")
    print(f"PDFs : {report['summary']['pdfs']} | Lignes matières : {report['summary']['grades_total']}")
    if args.apply:
        r = report["apply_result"]
        print(f"Élèves reconnus : {r['students_matched']} | Notes : {r['notes_created']} | Non matchés : {len(r['students_unmatched'])}")
        if r["students_unmatched"]:
            print("Non matchés :", json.dumps(r["students_unmatched"][:5], ensure_ascii=False))
        if r["errors"]:
            print("Erreurs :", len(r["errors"]))
    else:
        print("Dry-run — relancez avec --apply")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
