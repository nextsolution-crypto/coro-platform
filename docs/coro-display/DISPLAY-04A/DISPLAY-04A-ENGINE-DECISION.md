# DISPLAY-04A — Décision moteur

| Moteur | Technique | Licence/distribution | Décision |
|---|---|---|---|
| PDFium | robuste, BSD-3, JS/XFA désactivables | chaîne native lourde à maintenir | cible privilégiée à benchmarker en 04B |
| Poppler (`pdfinfo`, `pdftocairo`) | mature, déjà présent dans l'image CORO | GPL et obligations de redistribution à valider | moteur du candidat local, **conditionnel** |
| MuPDF | performant | AGPL ou licence commerciale | bloqué sans décision juridique/commerciale |

Poppler est invoqué uniquement par `execFile`, sans shell et avec arguments fixes, délai et buffers bornés. Aucune commande utilisateur n'est construite. La mise en production reste interdite avant validation de licence et comparaison visuelle PDFium/Poppler.
