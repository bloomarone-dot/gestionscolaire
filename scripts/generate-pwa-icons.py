#!/usr/bin/env python3
"""Génère les icônes PNG PWA et client (.ico) pour raccourcis bureau."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "frontend" / "public" / "icons"
CLIENT = ROOT / "scripts" / "client"


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (37, 99, 235, 255))
    draw = ImageDraw.Draw(img)
    margin = size * 0.12
    radius = size * 0.18
    draw.rounded_rectangle(
        (margin, margin, size - margin, size - margin),
        radius=radius,
        fill=(37, 99, 235, 255),
    )
    cx, cy = size / 2, size / 2
    cap_w = size * 0.42
    cap_h = size * 0.12
    draw.rounded_rectangle(
        (cx - cap_w / 2, cy - size * 0.28, cx + cap_w / 2, cy - size * 0.28 + cap_h),
        radius=cap_h / 3,
        fill=(251, 191, 36, 255),
    )
    draw.polygon(
        [
            (cx - cap_w / 2, cy - size * 0.16),
            (cx, cy - size * 0.04),
            (cx + cap_w / 2, cy - size * 0.16),
            (cx, cy - size * 0.22),
        ],
        fill=(255, 255, 255, 245),
    )
    draw.line(
        (cx - size * 0.22, cy - size * 0.08, cx + size * 0.22, cy - size * 0.08),
        fill=(29, 78, 216, 255),
        width=max(2, int(size * 0.025)),
    )
    draw.line(
        (cx, cy - size * 0.04, cx, cy + size * 0.24),
        fill=(29, 78, 216, 255),
        width=max(2, int(size * 0.025)),
    )
    return img


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    CLIENT.mkdir(parents=True, exist_ok=True)
    for px in (192, 256, 512):
        path = ICONS / f"icon-{px}.png"
        draw_icon(px).save(path, "PNG")
        print(f"Wrote {path}")
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    base = draw_icon(256)
    ico_path = CLIENT / "edugestion.ico"
    base.save(ico_path, format="ICO", sizes=ico_sizes)
    print(f"Wrote {ico_path}")


if __name__ == "__main__":
    main()
