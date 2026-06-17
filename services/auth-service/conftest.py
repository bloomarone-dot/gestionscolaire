"""Rend `app` et `gs-common` importables lors des tests (sans installation)."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
COMMON = ROOT.parent.parent / "libs" / "common"

for path in (ROOT, COMMON):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))
