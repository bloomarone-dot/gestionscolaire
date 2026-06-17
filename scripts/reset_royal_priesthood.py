#!/usr/bin/env python3
"""Supprime Royal Priesthood Academy et toutes ses données importées.

Usage:
  python3 scripts/reset_royal_priesthood.py
  python3 scripts/reset_royal_priesthood.py --apply
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

API_URL = os.environ.get("EDUGESTION_API_URL", "http://localhost:8082")
SCHOOL_ID = int(os.environ.get("ROYAL_SCHOOL_ID", "2"))
SCHOOL_NAME = "Royal Priesthood Academy"
SUPER_PHONE = os.environ.get("SUPERADMIN_PHONE", "690000000")
SUPER_PASSWORD = os.environ.get("SUPERADMIN_PASSWORD", "ChangeMe2026!")


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


def login() -> str:
    _, data = api("POST", "/auth/login", None, {"phone": SUPER_PHONE, "password": SUPER_PASSWORD})
    return data["access_token"]


def purge_auth_accounts() -> int:
    sql = (
        f"DELETE FROM accounts WHERE tenant_id = {SCHOOL_ID} "
        "OR phone LIKE '6901%' OR phone = '690000101';"
    )
    proc = subprocess.run(
        [
            "docker", "compose", "exec", "-T", "postgres",
            "psql", "-U", "gs", "-d", "auth_db", "-c", sql,
        ],
        cwd=Path(__file__).resolve().parents[1],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or proc.stdout)
    return int(proc.stdout.split("DELETE ")[-1].split()[0]) if "DELETE" in proc.stdout else 0


def apply_reset(token: str) -> dict:
    sid = SCHOOL_ID
    report = {"school_id": sid, "deleted": {}}

    notes = api("GET", "/evaluations/notes", token, school_id=sid)[1]
    for note in notes:
        api("DELETE", f"/evaluations/notes/{note['id']}", token, school_id=sid)
    report["deleted"]["notes"] = len(notes)

    eleves = api("GET", "/eleves", token, school_id=sid)[1]
    for eleve in eleves:
        api("DELETE", f"/eleves/{eleve['id']}", token, school_id=sid)
    report["deleted"]["eleves"] = len(eleves)

    personnel = api("GET", "/personnel", token, school_id=sid)[1]
    for p in personnel:
        api("DELETE", f"/personnel/{p['id']}", token, school_id=sid)
    report["deleted"]["personnel"] = len(personnel)

    classes = api("GET", "/pedagogie/classes", token, school_id=sid)[1]
    for classe in classes:
        api("DELETE", f"/pedagogie/classes/{classe['id']}", token, school_id=sid)
    report["deleted"]["classes"] = len(classes)

    try:
        api("DELETE", f"/tenants/schools/{sid}", token)
        report["deleted"]["school"] = SCHOOL_NAME
    except RuntimeError as exc:
        report["school_delete_error"] = str(exc)

    try:
        report["deleted"]["auth_accounts"] = purge_auth_accounts()
    except RuntimeError as exc:
        report["auth_purge_error"] = str(exc)

    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    schools = []
    if args.apply:
        token = login()
        schools = api("GET", "/tenants/schools", token)[1]
        target = next((s for s in schools if s["id"] == SCHOOL_ID), None)
        if not target:
            print(f"École id={SCHOOL_ID} introuvable — rien à supprimer.")
            return 0
        report = apply_reset(token)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        print(f"Royal Priesthood supprimé. État restauré (école id={SCHOOL_ID} effacée).")
    else:
        token = login()
        schools = api("GET", "/tenants/schools", token)[1]
        target = next((s for s in schools if s["id"] == SCHOOL_ID), None)
        if target:
            print(f"À supprimer : {target['name']} (id={SCHOOL_ID})")
            print("Relancez avec --apply pour effacer toutes les données.")
        else:
            print(f"École id={SCHOOL_ID} déjà absente.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
