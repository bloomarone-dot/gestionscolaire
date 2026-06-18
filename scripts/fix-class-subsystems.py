#!/usr/bin/env python3
"""Corrige subsystem_code des classes existantes (détection Form / 6ème / 1ère…).

Usage:
  python3 scripts/fix-class-subsystems.py --dry-run
  EDUGESTION_API_URL=https://scolaire.bloomarone.com \\
    EDUGESTION_PHONE=690000000 EDUGESTION_PASSWORD='ChangeMe2026!' \\
    python3 scripts/fix-class-subsystems.py --apply
  EDUGESTION_TOKEN=... python3 scripts/fix-class-subsystems.py --apply --school-id 3
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]

API_URL = os.environ.get("EDUGESTION_API_URL", "http://localhost:8082").rstrip("/")
TOKEN = os.environ.get("EDUGESTION_TOKEN", "")
PHONE = os.environ.get("EDUGESTION_PHONE", "")
PASSWORD = os.environ.get("EDUGESTION_PASSWORD", "")


def _load_subsystem_module():
    """Charge subsystem.py sans importer le package common (évite pydantic_settings)."""
    path = ROOT / "libs" / "common" / "common" / "subsystem.py"
    spec = importlib.util.spec_from_file_location("subsystem", path)
    if spec is None or spec.loader is None:
        raise SystemExit(f"Module introuvable : {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_subsystem = _load_subsystem_module()
resolve_subsystem_code = _subsystem.resolve_subsystem_code


def api(
    method: str,
    path: str,
    token: str,
    payload: dict | None = None,
    school_id: int | None = None,
) -> tuple[int, object]:
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    if school_id is not None:
        headers["X-School-Id"] = str(school_id)
    data = json.dumps(payload).encode() if payload is not None else None
    req = Request(f"{API_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else None
    except HTTPError as exc:
        detail = exc.read().decode()
        raise SystemExit(f"{method} {path} → {exc.code}: {detail}") from exc


def login() -> str:
    if TOKEN:
        return TOKEN
    if not PHONE or not PASSWORD:
        raise SystemExit(
            "Fournissez EDUGESTION_TOKEN ou EDUGESTION_PHONE + EDUGESTION_PASSWORD",
        )
    _, data = api("POST", "/auth/login", "", {"phone": PHONE, "password": PASSWORD})
    return data["access_token"]


def list_school_ids(token: str, school_id: int | None) -> list[int]:
    if school_id is not None:
        return [school_id]
    _, schools = api("GET", "/tenants/schools", token)
    if not isinstance(schools, list):
        raise SystemExit("Impossible de lister les établissements (superadmin requis ?)")
    return [s["id"] for s in schools if s.get("id") is not None]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Appliquer les corrections")
    parser.add_argument("--dry-run", action="store_true", help="Afficher sans modifier")
    parser.add_argument("--school-id", type=int, default=None, help="Limiter à un établissement")
    args = parser.parse_args()
    if not args.apply and not args.dry_run:
        parser.error("Indiquez --dry-run ou --apply")

    token = login()
    school_ids = list_school_ids(token, args.school_id)

    total = 0
    for sid in school_ids:
        _, classes = api("GET", "/pedagogie/classes", token, school_id=sid)
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
                api(
                    "PUT",
                    f"/pedagogie/classes/{classe['id']}",
                    token,
                    {"subsystem_code": resolved},
                    school_id=sid,
                )

    print(
        f"\n{total} classe(s) à corriger."
        if args.dry_run
        else f"\n{total} classe(s) corrigée(s).",
    )


if __name__ == "__main__":
    main()
