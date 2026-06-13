#!/usr/bin/env python3
"""Importe les référentiels du fichier Tableaux_Plateforme_Scolaire.xlsx.

Le script ne dépend pas de openpyxl. Il lit le XLSX avec zipfile/XML.

Exemples:
  python3 scripts/import_school_excel.py /home/brice-mboule/Tableaux_Plateforme_Scolaire.xlsx
  EDUGESTION_TOKEN=... python3 scripts/import_school_excel.py /home/brice-mboule/Tableaux_Plateforme_Scolaire.xlsx --api-url http://localhost:8082 --apply
  EDUGESTION_TOKEN=... python3 scripts/import_school_excel.py /home/brice-mboule/Tableaux_Plateforme_Scolaire.xlsx --api-url http://localhost:8082 --apply --load-eligibility
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET
from zipfile import ZipFile

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
REL_NS = {"rel": "http://schemas.openxmlformats.org/package/2006/relationships"}

SUBJECT_CODE_BY_NAME = {
    "francais": "FR_FRANCAIS",
    "anglais": "FR_ANGLAIS",
    "anglais ou langue 1 selon section": "FR_ANGLAIS",
    "mathematiques": "FR_MATHS",
    "sciences de la vie et de la terre svt": "FR_SVT",
    "physique chimie technologie pct": "FR_PCT",
    "histoire": "FR_HIST",
    "geographie": "FR_GEO",
    "education a la citoyennete ecm": "FR_ECM",
    "espagnol allemand 2eme langue": "FR_LV2",
    "education physique et sportive eps": "FR_EPS",
    "eps": "FR_EPS",
    "arts plastiques": "FR_ARTS",
    "informatique": "FR_INFO",
    "philosophie": "FR_PHILO",
    "comptabilite generale": "FR_COMPTA",
    "economie generale": "FR_ECO",
    "droit": "FR_DROIT",
    "organisation et gestion des entreprises": "FR_OGE",
    "mathematiques financieres": "FR_MATHFIN",
    "informatique de gestion": "FR_INFOGE",
    "technologie de specialite selon f1 f2 f3": "FR_TECHSPE",
    "dessin technique dao": "FR_DESSIN",
    "physique appliquee": "FR_PHYSAPP",
    "travaux pratiques d atelier": "FR_TPATELIER",
    "english language": "EN_ENGLISH",
    "french": "EN_FRENCH",
    "mathematics": "EN_MATHS",
    "biology": "EN_BIO",
    "chemistry": "EN_CHEM",
    "physics": "EN_PHYS",
    "history": "EN_HIST",
    "geography": "EN_GEO",
    "citizenship education": "EN_CITIZEN",
    "literature in english": "EN_LIT",
    "computer science": "EN_CS",
    "physical education pe": "EN_PE",
}


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^A-Za-z0-9]+", " ", value).strip().lower()
    return value


def subject_code(name: str) -> str:
    key = normalize_text(name)
    if key in SUBJECT_CODE_BY_NAME:
        return SUBJECT_CODE_BY_NAME[key]
    raw = re.sub(r"[^A-Z0-9]+", "_", unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().upper()).strip("_")
    return f"XLS_{raw[:40] or 'SUBJECT'}"


def col_idx(ref: str) -> int:
    letters = "".join(ch for ch in ref if ch.isalpha())
    total = 0
    for ch in letters:
        total = total * 26 + ord(ch.upper()) - 64
    return total - 1


def cell_value(cell: ET.Element, shared: list[str]) -> str:
    kind = cell.attrib.get("t")
    if kind == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//a:t", NS)).strip()
    value = cell.find("a:v", NS)
    if value is None:
        return ""
    raw = value.text or ""
    if kind == "s":
        return shared[int(raw)].strip() if raw else ""
    return raw.strip()


def read_xlsx(path: Path) -> dict[str, list[list[str]]]:
    with ZipFile(path) as archive:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = ["".join(t.text or "" for t in si.findall(".//a:t", NS)) for si in root.findall("a:si", NS)]

        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        rid_to_target = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels.findall("rel:Relationship", REL_NS)}
        sheets: dict[str, list[list[str]]] = {}

        for sheet in workbook.find("a:sheets", NS):
            name = sheet.attrib["name"]
            rid = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            target = rid_to_target[rid].lstrip("/")
            xml_path = target if target.startswith("xl/") else f"xl/{target}"
            root = ET.fromstring(archive.read(xml_path))
            rows: list[list[str]] = []
            for row in root.findall(".//a:sheetData/a:row", NS):
                values: list[str] = []
                for cell in row.findall("a:c", NS):
                    idx = col_idx(cell.attrib.get("r", "A1"))
                    while len(values) < idx:
                        values.append("")
                    values.append(cell_value(cell, shared))
                if any(values):
                    rows.append(values)
            sheets[name] = rows
        return sheets


def parse_domains(rows: list[list[str]]) -> list[dict]:
    domains = []
    capture = False
    for row in rows:
        if row[:2] == ["Code Domaine", "Nom du Domaine"]:
            capture = True
            continue
        if capture:
            if not row or not row[0] or row[0].startswith("Tableau"):
                break
            domains.append({"code": row[0], "name": row[1] if len(row) > 1 else ""})
    return domains


def parse_subject_tables(rows: list[list[str]]) -> tuple[list[dict], list[dict]]:
    subjects: dict[str, dict] = {}
    eligibility: list[dict] = []
    current = None

    for row in rows:
        first = row[0] if row else ""
        if first.startswith("Tableau 3.2"):
            current = "premier_fr"
            continue
        if first.startswith("Tableau 3.3"):
            current = "second_fr"
            continue
        if first.startswith("Tableau 3.4"):
            current = "tech_commercial"
            continue
        if first.startswith("Tableau 3.5"):
            current = "tech_industrial"
            continue
        if first.startswith("Tableau 3.6"):
            current = "anglo"
            continue
        if not current or first in {"Matière", "Subject"} or not first:
            continue

        code = subject_code(first)
        domain = row[1] if len(row) > 1 else ""
        subjects.setdefault(code, {"code": code, "name": first, "domain": domain})

        if current == "premier_fr" and len(row) > 2:
            for level in ["6E", "5E", "4E", "3E"]:
                eligibility.append({"subject_code": code, "level_code": level, "series_code": None, "default_coefficient": float(row[2])})
        elif current == "second_fr" and len(row) > 5:
            for series, coef in [("A1", row[2]), ("A2", row[2]), ("A4", row[3]), ("C", row[4]), ("D", row[5])]:
                if coef and coef != "—":
                    for level in ["2ND", "1ERE", "TLE"]:
                        eligibility.append({"subject_code": code, "level_code": level, "series_code": series, "default_coefficient": float(coef)})
        elif current == "tech_commercial" and len(row) > 2:
            for level, series_list in {"2ND-T": ["CG", "ACC"], "1ERE-T": ["G1", "G2"], "TLE-T": ["G1", "G2"]}.items():
                for series in series_list:
                    eligibility.append({"subject_code": code, "level_code": level, "series_code": series, "default_coefficient": float(row[2])})
        elif current == "tech_industrial" and len(row) > 2:
            for level in ["1ERE-T", "TLE-T"]:
                for series in ["F1", "F2", "F3"]:
                    eligibility.append({"subject_code": code, "level_code": level, "series_code": series, "default_coefficient": float(row[2])})
        elif current == "anglo" and len(row) > 2:
            for level in ["F1", "F2", "F3", "F4", "F5"]:
                eligibility.append({"subject_code": code, "level_code": level, "series_code": None, "default_coefficient": float(row[2])})

    return list(subjects.values()), eligibility


def post_json(api_url: str, token: str, path: str, payload: dict) -> tuple[int, str]:
    data = json.dumps(payload).encode("utf-8")
    request = Request(
        f"{api_url.rstrip('/')}{path}",
        data=data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            return response.status, response.read().decode("utf-8")
    except HTTPError as err:
        return err.code, err.read().decode("utf-8")
    except URLError as err:
        raise RuntimeError(f"API inaccessible: {err}") from err


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("xlsx", type=Path)
    parser.add_argument("--api-url", default=os.environ.get("EDUGESTION_API_URL", "http://localhost:8082"))
    parser.add_argument("--token", default=os.environ.get("EDUGESTION_TOKEN"))
    parser.add_argument("--apply", action="store_true", help="Envoie les matières au backend.")
    parser.add_argument("--load-eligibility", action="store_true", help="Charge aussi les coefficients par niveau/série. Peut créer des doublons si relancé.")
    parser.add_argument("--output", type=Path, default=Path("deploy-data/import_school_excel_report.json"))
    args = parser.parse_args()

    sheets = read_xlsx(args.xlsx)
    ref_rows = sheets.get("Référentiel des Matières", [])
    subjects, eligibility = parse_subject_tables(ref_rows)
    report = {
      "source": str(args.xlsx),
      "sheets": list(sheets),
      "domains": parse_domains(ref_rows),
      "subjects": subjects,
      "eligibility": eligibility,
      "applied": False,
      "results": [],
    }

    if args.apply:
        if not args.token:
            print("EDUGESTION_TOKEN ou --token est requis avec --apply", file=sys.stderr)
            return 2
        report["applied"] = True
        for subject in subjects:
            status, body = post_json(args.api_url, args.token, "/referentiel/subjects", {"code": subject["code"], "name": subject["name"]})
            report["results"].append({"type": "subject", "code": subject["code"], "status": status, "body": body[:300]})
        if args.load_eligibility:
            for item in eligibility:
                payload = {**item, "is_obligatoire": False, "groupe": None}
                status, body = post_json(args.api_url, args.token, "/referentiel/eligibility", payload)
                report["results"].append({"type": "eligibility", "subject_code": item["subject_code"], "level_code": item["level_code"], "series_code": item["series_code"], "status": status, "body": body[:300]})

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Rapport écrit: {args.output}")
    print(f"Matières: {len(subjects)} | Eligibilités: {len(eligibility)} | Apply: {args.apply}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
