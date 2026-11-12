from pathlib import Path

from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import landscape
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "docs" / "coro-display" / "DISPLAY-09-DEMO-PILOT" / "assets"
OUTPUT.mkdir(parents=True, exist_ok=True)


def centered(c: canvas.Canvas, text: str, y: float, size: float, color=HexColor("#203449")) -> None:
    c.setFont("Helvetica-Bold", size)
    c.setFillColor(color)
    c.drawString((1224 - stringWidth(text, "Helvetica-Bold", size)) / 2, y, text)


def build(version: int, marker: str, accent: str) -> Path:
    target = OUTPUT / f"CORO-DISPLAY-DEMO-TOUR-PREMONT-E03-V{version}.pdf"
    page_size = landscape((11 * inch, 17 * inch))
    c = canvas.Canvas(str(target), pagesize=page_size, pageCompression=1)
    width, height = page_size
    c.setTitle(f"CORO Display Demo - Tour Premont - E03 - V{version}")
    c.setAuthor("CORO - synthetic demonstration artifact")
    c.setFillColor(HexColor("#F4F7FA"))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    c.setFillColor(HexColor("#102A43"))
    c.rect(0, height - 72, width, 72, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 25)
    c.drawString(38, height - 44, "CORO DISPLAY - PLAN D'EVACUATION FICTIF")
    c.setFont("Helvetica", 12)
    c.drawRightString(width - 38, height - 42, f"VERSION V{version} - ETAGE DEMO E03")

    c.setFillColor(HexColor("#C62828"))
    c.rect(0, 0, width, 46, fill=1, stroke=0)
    centered(c, "DEMONSTRATION - NE PAS UTILISER EN SITUATION REELLE", 15, 17, white)

    c.setFillColor(HexColor("#203449"))
    c.setFont("Helvetica-Bold", 17)
    c.drawString(38, height - 108, "Etage 3 - Corridor Est - CORO Display Demo")
    c.setFont("Helvetica", 10)
    c.drawString(38, height - 126, "Schema entierement synthetique. Aucune caracteristique reelle du batiment n'est representee.")

    x0, y0, plan_w, plan_h = 55, 105, 870, 480
    c.setFillColor(white)
    c.setStrokeColor(HexColor("#203449"))
    c.setLineWidth(3)
    c.rect(x0, y0, plan_w, plan_h, fill=1, stroke=1)

    rooms = [
        (x0 + 20, y0 + 285, 210, 165, "BUREAU DEMO A"),
        (x0 + 250, y0 + 285, 210, 165, "SALLE DEMO B"),
        (x0 + 480, y0 + 285, 170, 165, "LOCAL DEMO C"),
        (x0 + 670, y0 + 285, 180, 165, "ZONE DEMO D"),
        (x0 + 20, y0 + 30, 250, 150, "ESPACE DEMO E"),
        (x0 + 600, y0 + 30, 250, 150, "ESPACE DEMO F"),
    ]
    c.setLineWidth(1.5)
    for x, y, w, h, label in rooms:
        c.setFillColor(HexColor("#E8EEF4"))
        c.rect(x, y, w, h, fill=1, stroke=1)
        c.setFillColor(HexColor("#203449"))
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x + w / 2, y + h / 2, label)

    c.setFillColor(HexColor("#FFF7E6"))
    c.rect(x0 + 285, y0 + 25, 300, 220, fill=1, stroke=1)
    c.setFillColor(HexColor("#203449"))
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(x0 + 435, y0 + 205, "CORRIDOR EST - DEMO")

    c.setStrokeColor(HexColor(accent))
    c.setFillColor(HexColor(accent))
    c.setLineWidth(8)
    c.line(x0 + 435, y0 + 175, x0 + 435, y0 + 65)
    c.line(x0 + 435, y0 + 65, x0 + 885, y0 + 65)
    c.line(x0 + 885, y0 + 65, x0 + 885, y0 + 20)
    c.line(x0 + 870, y0 + 35, x0 + 885, y0 + 20)
    c.line(x0 + 900, y0 + 35, x0 + 885, y0 + 20)

    c.setFillColor(HexColor(accent))
    c.circle(x0 + 435, y0 + 175, 22, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x0 + 435, y0 + 171, "VOUS")
    c.setFillColor(HexColor("#127A4A"))
    c.rect(x0 + 850, y0 + 0, 70, 30, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(x0 + 885, y0 + 10, "SORTIE")

    side_x = 960
    c.setFillColor(HexColor("#FFFFFF"))
    c.setStrokeColor(HexColor("#C3CDD9"))
    c.roundRect(side_x, 325, 225, 260, 12, fill=1, stroke=1)
    c.setFillColor(HexColor("#203449"))
    c.setFont("Helvetica-Bold", 15)
    c.drawString(side_x + 18, 555, "CONSIGNES DEMO")
    c.setFont("Helvetica", 11)
    lines = [
        "1. Ceci est un exercice visuel.",
        "2. Ne suivez pas ce plan en urgence.",
        "3. Reperez la version affichee.",
        "4. Validez la mise a jour V1 / V2.",
        "5. Signalez toute incoherence.",
    ]
    for index, line in enumerate(lines):
        c.drawString(side_x + 18, 520 - index * 34, line)

    c.setFillColor(HexColor(accent))
    c.roundRect(side_x, 190, 225, 105, 12, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(side_x + 112.5, 255, f"REPERE {marker}")
    c.setFont("Helvetica-Bold", 26)
    c.drawCentredString(side_x + 112.5, 215, f"V{version}")

    c.setFillColor(Color(0.12, 0.20, 0.28, alpha=1))
    c.setFont("Helvetica", 9)
    c.drawString(960, 150, "Document synthetique pour le pilote")
    c.drawString(960, 137, "logiciel CORO Display. Aucune donnee")
    c.drawString(960, 124, "client, instruction reglementaire ou")
    c.drawString(960, 111, "geometrie reelle n'est representee.")
    c.save()
    return target


if __name__ == "__main__":
    for item in (build(1, "BLEU", "#1677C8"), build(2, "VERT", "#168A55")):
        print(item)
