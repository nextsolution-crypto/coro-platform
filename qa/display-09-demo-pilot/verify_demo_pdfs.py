from __future__ import annotations

import hashlib
import unicodedata
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "docs" / "coro-display" / "DISPLAY-09-DEMO-PILOT" / "assets"
FILES = (
    ASSETS / "CORO-DISPLAY-DEMO-TOUR-PREMONT-E03-V1.pdf",
    ASSETS / "CORO-DISPLAY-DEMO-TOUR-PREMONT-E03-V2.pdf",
)
WARNING = "DÉMONSTRATION — NE PAS UTILISER EN SITUATION RÉELLE"


def normalized(value: str) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFKD", value.replace("—", "-"))
        if not unicodedata.combining(character)
    )


def main() -> None:
    hashes: list[str] = []
    for expected_version, path in enumerate(FILES, start=1):
        reader = PdfReader(path)
        assert len(reader.pages) == 1, f"{path.name}: expected one page"
        page = reader.pages[0]
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        assert abs(width - 1224) < 1 and abs(height - 792) < 1, (
            f"{path.name}: expected 17x11 inches at 72 points/inch, got {width}x{height}"
        )
        text = page.extract_text()
        assert normalized(WARNING) in normalized(text), f"{path.name}: mandatory warning missing"
        assert f"VERSION V{expected_version}" in text, f"{path.name}: version marker missing"
        hashes.append(hashlib.sha256(path.read_bytes()).hexdigest())

    assert len(set(hashes)) == 2, "V1 and V2 must have different byte content"
    print("DISPLAY-09-DEMO-PILOT PDF verification: PASS")


if __name__ == "__main__":
    main()
