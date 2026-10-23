"""Reproducible, ASCII-only PDFs. All content is fictitious and non-operational."""
import hashlib
import json
from pathlib import Path
import zlib
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2] / "coro-backend" / "assets" / "knowledge-qa"
ROOT.mkdir(parents=True, exist_ok=True)


def pdf(pages):
    objects = ["", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    kids = []
    for page in pages:
        image_ref = ""
        if isinstance(page, Image.Image):
            raw = zlib.compress(page.tobytes(), 9).hex() + ">"
            image_id = len(objects) + 1
            objects.append(f"<< /Type /XObject /Subtype /Image /Width {page.width} /Height {page.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter [/ASCIIHexDecode /FlateDecode] /Length {len(raw)} >>\nstream\n{raw}\nendstream")
            image_ref = f" /XObject << /Scan {image_id} 0 R >>"
            content = "q 540 0 0 680 36 56 cm /Scan Do Q\n"
        else:
            content = "BT /F1 12 Tf 52 744 Td 19 TL\n"
            for index, line in enumerate(page):
                escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
                content += ("T* " if index else "") + f"({escaped}) Tj\n"
            content += "ET\n"
        content_id = len(objects) + 1
        objects.append(f"<< /Length {len(content)} >>\nstream\n{content}endstream")
        page_id = len(objects) + 1
        objects.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >>{image_ref} >> /Contents {content_id} 0 R >>")
        kids.append(f"{page_id} 0 R")
    objects[0] = "<< /Type /Catalog /Pages 2 0 R >>"
    objects[1] = f"<< /Type /Pages /Count {len(pages)} /Kids [{' '.join(kids)}] >>"
    result = "%PDF-1.4\n"
    offsets = []
    for index, obj in enumerate(objects, 1):
        offsets.append(len(result))
        result += f"{index} 0 obj\n{obj}\nendobj\n"
    startxref = len(result)
    result += f"xref\n0 {len(objects)+1}\n0000000000 65535 f \n"
    result += "".join(f"{offset:010} 00000 n \n" for offset in offsets)
    result += f"trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{startxref}\n%%EOF\n"
    return result.encode("ascii")


def native(version, code):
    return pdf([
        ["CORO MASTER - CORPUS FICTIF", "NE PAS UTILISER EN INTERVENTION", f"Version documentaire fictive {version}",
         "1. Portee du test", "Ce document ne represente aucun site, personne ou incident reel.",
         "Il contient des codes d'inventaire fictifs pour tester les citations.",
         "Aucune procedure de securite ne doit etre deduite de ce contenu."],
        ["2. Tableau des codes fictifs", "Zone | Code d'inventaire | Observation", f"Orme | {code} | Echantillon de recette",
         "Pin | CODE-PIN-062 | Autre echantillon", "La ligne Orme est la reference a citer a la page 2.",
         "Ce tableau ne contient aucune consigne operationnelle."],
        ["3. Limites du document fictif", "Aucun numero de telephone d'urgence n'est fourni.",
         "Aucune adresse de vanne ou de point de rassemblement n'est fournie.",
         "En cas de contradiction entre deux sources, ne pas choisir arbitrairement.",
         "FIN DU DOCUMENT FICTIF - page 3."],
    ])


scan = Image.new("L", (1200, 1500), 255)
draw = ImageDraw.Draw(scan)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 35)
lines = ["CORO - DOCUMENT SCANNE FICTIF", "NE PAS UTILISER EN INTERVENTION", "Section 1 - Test de lecture locale",
         "Le code de recette OCR est CORO-SCAN-2026.", "Ce document ne concerne aucun batiment reel.",
         "Aucune consigne de securite n'est presente.", "Source de validation : page 1."]
for index, line in enumerate(lines):
    draw.text((60, 80 + index * 130), line, fill=0, font=font)

fixtures = {
    "master-native-v1.pdf": native(1, "CODE-ORME-031"),
    "master-native-v2.pdf": native(2, "CODE-ORME-047"),
    "master-contradiction.pdf": native(1, "CODE-ORME-055"),
    "master-scanned.pdf": pdf([scan]),
    "master-mixed.pdf": pdf([["CORO - DOCUMENT MIXTE FICTIF", "La premiere page contient du texte natif.",
                               "Le code OCR se trouve a la page 2.", "Aucun usage operationnel."], scan]),
}
inventory = []
for name, data in fixtures.items():
    (ROOT / name).write_bytes(data)
    inventory.append({"name": name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)})
(ROOT / "inventory.json").write_text(json.dumps({"syntheticOnly": True, "files": inventory}, indent=2) + "\n")
print(json.dumps(inventory, indent=2))
