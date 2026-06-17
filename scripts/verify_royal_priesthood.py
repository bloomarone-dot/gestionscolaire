#!/usr/bin/env python3
"""Vérifie Doc_RoyalPriestHood avant import (élèves + professeurs).

Usage:
  python3 scripts/verify_royal_priesthood.py
  python3 scripts/verify_royal_priesthood.py --full   # extrait aussi noms depuis PDF (pdftotext)
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from import_royal_priesthood import (  # noqa: E402
    CLASS_DEFS,
    DOC_DIR,
    collect_from_pdfs,
    norm_key,
)


def load_professeurs(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("professeurs.json doit être une liste JSON")
    return data


def validate_prof(prof: dict, index: int) -> list[str]:
    errors = []
    for field in ("nom", "sexe", "phone"):
        if not str(prof.get(field) or "").strip():
            errors.append(f"prof[{index}] : champ '{field}' manquant")
    if prof.get("sexe") and str(prof["sexe"]).upper() not in ("M", "F"):
        errors.append(f"prof[{index}] : sexe doit être M ou F")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="Parse les PDF (nécessite pdftotext)")
    args = parser.parse_args()

    print("=== Vérification Royal Priesthood ===\n")
    print(f"Dossier PDF : {DOC_DIR}")
    print(f"Existe      : {DOC_DIR.is_dir()}")
    if not DOC_DIR.is_dir():
        print("\nERREUR : placez Doc_RoyalPriestHood à la racine du projet.")
        return 1

    pdfs = sorted(DOC_DIR.rglob("*.pdf"))
    by_class: dict[str, list[str]] = {}
    unmapped: list[str] = []
    for pdf in pdfs:
        rel = pdf.relative_to(DOC_DIR)
        key = norm_key(str(rel.parent))
        if not key:
            unmapped.append(str(rel))
        else:
            by_class.setdefault(key, []).append(pdf.name)

    print(f"\nPDF trouvés : {len(pdfs)}")
    print("\n--- Eleves (1 bulletin PDF ~ 1 eleve) ---")
    total = 0
    for key in sorted(CLASS_DEFS, key=lambda k: CLASS_DEFS[k]["nom"]):
        count = len(by_class.get(key, []))
        total += count
        status = "OK" if count else "vide"
        print(f"  [{status:4}] {CLASS_DEFS[key]['nom']:16} : {count:2} PDF")
    print(f"\n  Total élèves estimés : {total}")

    if unmapped:
        print(f"\n  ATTENTION — {len(unmapped)} PDF non classés :")
        for item in unmapped:
            print(f"    - {item}")

    prof_path = DOC_DIR / "professeurs.json"
    example_path = DOC_DIR / "professeurs.example.json"
    print("\n--- Professeurs ---")
    if prof_path.is_file():
        try:
            profs = load_professeurs(prof_path)
            errors: list[str] = []
            for i, prof in enumerate(profs):
                errors.extend(validate_prof(prof, i))
            print(f"  professeurs.json : {len(profs)} entrée(s)")
            if errors:
                print("  Erreurs :")
                for err in errors:
                    print(f"    - {err}")
            else:
                for prof in profs:
                    print(
                        f"    - {prof.get('prenom', '')} {prof.get('nom', '')} "
                        f"({prof.get('phone')}) — {prof.get('specialite', '—')}"
                    )
        except (json.JSONDecodeError, ValueError) as exc:
            print(f"  ERREUR professeurs.json : {exc}")
            return 1
    else:
        print("  professeurs.json : ABSENT")
        print("  -> Les professeurs ne seront PAS importes.")
        if example_path.is_file():
            print(f"  -> Copiez {example_path.name} vers professeurs.json et remplissez vos enseignants.")

    print("\n--- Outils ---")
    print(f"  pdftotext : {'OK' if shutil.which('pdftotext') else 'MANQUANT (apt install poppler-utils sur Linux)'}")

    if args.full:
        if not shutil.which("pdftotext"):
            print("\nImpossible --full sans pdftotext.")
            return 1
        students, matieres = collect_from_pdfs()
        print("\n--- Extraction PDF (noms élèves) ---")
        for key, rows in sorted(students.items(), key=lambda x: CLASS_DEFS[x[0]]["nom"] if x[0] in CLASS_DEFS else x[0]):
            if not rows:
                continue
            print(f"\n  {CLASS_DEFS.get(key, {}).get('nom', key)}:")
            for row in rows:
                name = f"{row.get('prenom') or ''} {row.get('nom') or ''}".strip()
                mat = row.get("matricule") or "—"
                print(f"    - {name} (matricule: {mat})")
        mat_count = sum(len(v) for v in matieres.values())
        print(f"\n  Matières extraites (total lignes) : {mat_count}")

    print("\n--- Prochaines étapes ---")
    print("  1. docker compose up --build -d && ./scripts/seed-superadmin.sh")
    print("  2. python3 scripts/import_royal_priesthood.py --apply")
    print("  3. python3 scripts/import_royal_priesthood_notes.py --apply")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
