"""Analyse d'un bulletin modèle (PDF ou image) pour détecter la présentation."""
from __future__ import annotations

import io
import re
from typing import Any, Optional

try:
    from common.bulletin_layout import detect_from_text, layout_to_theme_suggestions, merge_detected_with_theme
except ImportError:
    def detect_from_text(text, establishment_kind=None):  # type: ignore
        return {"confidence": 0}

    def layout_to_theme_suggestions(colors):  # type: ignore
        return {}

    def merge_detected_with_theme(profile, detected_colors=None):  # type: ignore
        return profile


def _dominant_hex(pixels: list[tuple[int, int, int]]) -> Optional[str]:
    if not pixels:
        return None
    buckets: dict[tuple[int, int, int], int] = {}
    for r, g, b in pixels:
        key = (r // 32 * 32, g // 32 * 32, b // 32 * 32)
        buckets[key] = buckets.get(key, 0) + 1
    best = max(buckets, key=buckets.get)
    return f"#{best[0]:02x}{best[1]:02x}{best[2]:02x}"


def _region_color(img, y0: float, y1: float, x0: float = 0.0, x1: float = 1.0) -> Optional[str]:
    try:
        from PIL import Image
    except ImportError:
        return None
    if not isinstance(img, Image.Image):
        return None
    w, h = img.size
    box = (int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h))
    crop = img.crop(box).convert("RGB")
    crop = crop.resize((max(1, crop.width // 8), max(1, crop.height // 8)))
    pixels = list(crop.getdata())
    return _dominant_hex(pixels)


def _load_image_from_bytes(data: bytes, filename: str) -> tuple[Any, str]:
    """Retourne (PIL.Image, texte extrait)."""
    text = ""
    lower = (filename or "").lower()

    if lower.endswith(".pdf"):
        try:
            import fitz  # pymupdf
            doc = fitz.open(stream=data, filetype="pdf")
            page = doc[0]
            text = page.get_text("text") or ""
            pix = page.get_pixmap(matrix=fitz.Matrix(150 / 72, 150 / 72))
            from PIL import Image
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            return img, text
        except Exception:
            pass

    try:
        from PIL import Image
        img = Image.open(io.BytesIO(data))
        return img.convert("RGB"), text
    except Exception as exc:
        raise ValueError("Fichier non reconnu : envoyez un PDF ou une image (PNG/JPG).") from exc


def analyze_bulletin_template(
    data: bytes,
    filename: str,
    establishment_kind: str | None = None,
) -> dict[str, Any]:
    """Analyse un modèle de bulletin et retourne le profil de présentation détecté."""
    img, embedded_text = _load_image_from_bytes(data, filename)
    profile = detect_from_text(embedded_text, establishment_kind)

    colors = {
        "header": _region_color(img, 0.0, 0.18),
        "title_bar": _region_color(img, 0.18, 0.24),
        "table_header": _region_color(img, 0.28, 0.34),
        "group_row": _region_color(img, 0.34, 0.40),
        "summary": _region_color(img, 0.72, 0.82),
        "signatures": _region_color(img, 0.84, 0.95),
    }
    colors = {k: v for k, v in colors.items() if v}
    profile = merge_detected_with_theme(profile, colors)
    profile["source_filename"] = filename

    # Renforcer la confiance si les couleurs sont cohérentes
    if len(colors) >= 3:
        profile["confidence"] = min(1.0, float(profile.get("confidence", 0)) + 0.15)

    theme_suggestions = layout_to_theme_suggestions(colors)
    summary_fr = _human_summary(profile)

    return {
        "layout_profile": profile,
        "theme_suggestions": theme_suggestions,
        "summary": summary_fr,
        "detected_text_sample": (embedded_text or "")[:500],
    }


def _human_summary(profile: dict[str, Any]) -> str:
    style = profile.get("header_style", "bilingual")
    labels = {
        "bilingual": "En-tête bilingue (FR + EN)",
        "fr_only": "En-tête francophone uniquement",
        "en_only": "En-tête anglophone uniquement",
        "school_only": "En-tête établissement (sans bloc ministériel)",
    }
    parts = [labels.get(style, style)]
    if profile.get("show_subject_groups"):
        parts.append("groupes de matières")
    else:
        parts.append("liste simple (sans groupes)")
    if profile.get("period_mode") == "annual":
        parts.append("bulletin annuel")
    else:
        parts.append("par trimestre")
    conf = int(float(profile.get("confidence", 0)) * 100)
    return f"Détection : {', '.join(parts)} (confiance ~{conf} %)."
