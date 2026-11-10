# DISPLAY-03-REVIEW — Comparaison des moteurs PDF

| Moteur | Atouts | Contraintes | Verdict |
|---|---|---|---|
| Poppler (`pdftocairo`/`pdftoppm`) | mature, rasterisation robuste, outils CLI simples, informations de rotation/page | GPL; dépendance système; surface native à isoler | recommandé pour prototype après validation juridique |
| MuPDF (`mutool draw`) | rapide, rendu PNG/SVG/PDF, limites mémoire et rendu par bandes disponibles | AGPL ou licence commerciale pour SaaS propriétaire | excellent techniquement, NO-GO sans décision de licence |
| PDFium | moteur Chromium, licence BSD-3, options permettant de désactiver JS/XFA | construction GN/Ninja lourde, distribution native et maintenance plus complexes | alternative production permissive à évaluer |

Recommandation : prototype borné avec Poppler dans une image worker dédiée et version épinglée; benchmark visuel synthétique contre PDFium avant choix final. Ne jamais invoquer le moteur dans le processus HTTP.

Sources : [Poppler officiel](https://poppler.freedesktop.org/), [MuPDF — `mutool draw`](https://mupdf.readthedocs.io/en/1.28.5/tools/mutool-draw.html), [licence MuPDF](https://mupdf.readthedocs.io/en/1.28.5/license.html) et [dépôt PDFium officiel](https://pdfium.googlesource.com/pdfium.git). La licence et la redistribution devront être validées juridiquement avant livraison.
