#!/usr/bin/env python3
"""Corrige subsystem_code des classes existantes (détection Form / 6ème / 1ère…).

Usage:
  python3 scripts/fix-class-subsystems.py --dry-run
  EDUGESTION_API_URL=https://scolaire.bloomarone.com \\
    EDUGESTION_TOKEN=... python3 scripts/fix-class-subsystems.py --apply
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "libs" / "common"))

from common.subsystem import infer_subsystem_from_text, resolve_subsystem_code  # noqa: E402

API_URL = os.environ.get("EDUGESTION_API_URL", "http://localhost:8082").rstrip("/")
TOKEN = os.environ.get("EDUGESTION_TOKEN", "")


def api(method: str, path: str, body: dict | None = None) -> tuple[int, object]:
    headers = {"Content-Type": "application/json"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    data = json.dumps(body).encode() if body is not None else None
    req = Request(f"{API_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else None
    except HTTPError as exc:
        detail = exc.read().decode()
        raise SystemExit(f"{method} {path} → {exc.code}: {detail}") from exc


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Appliquer les corrections")
    parser.add_argument("--dry-run", action="store_true", help="Afficher sans modifier")
    args = parser.parse_args()
    if not args.apply and not args.dry_run:
        parser.error("Indiquez --dry-run ou --apply")

    _, schools = api("GET", "/tenants/schools")
    if not isinstance(schools, list):
        raise SystemExit("Impossible de lister les établissements (token admin requis ?)")

    total = 0
    for school in schools:
        sid = school["id"]
        _, classes = api("GET", f"/pedagogie/classes?school_id={sid}")
        if not isinstance(classes, list):
            continue
        for classe in classes:
            current = classe.get("subsystem_code")
            resolved = resolve_subsystem_code(classe)
            if not resolved or resolved == current:
                continue
            nom = classe.get("nom_personnalise") or classe.get("nom") or classe.get("id")
            print(f"[school {sid}] {nom}: {current!r} → {resolved}")
            total += 1
            if args.apply:
                api("PUT", f"/pedagogie/classes/{classe['id']}?school_id={sid}", {
                    "subsystem_code": resolved,
                })

    print(f"\n{total} classe(s) à corriger." if args.dry_run else f"\n{total} classe(s) corrigée(s).")


if __name__ == "__main__":
    main()
