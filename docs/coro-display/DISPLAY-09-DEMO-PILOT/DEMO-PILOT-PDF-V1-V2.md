# PDF V1 et V2

Les actifs synthétiques sont dans `assets/`. Ils sont au format paysage 17×11 pouces, une page, avec la mention visible `DÉMONSTRATION — NE PAS UTILISER EN SITUATION RÉELLE`. V1 utilise un repère bleu; V2 un repère vert et un numéro de version distinct.

`qa/display-09-demo-pilot/verify_demo_pdfs.py` vérifie dimensions, avertissement, marqueur de version et empreintes différentes. Les deux rendus Poppler ont été inspectés visuellement : titres, légende, corridors et avertissement sont lisibles, sans débordement. Ils ne représentent aucune géométrie réelle.
