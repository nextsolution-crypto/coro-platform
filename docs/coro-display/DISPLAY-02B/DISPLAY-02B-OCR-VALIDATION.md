# DISPLAY-02B — Validation OCR

## Environnement

Conteneur éphémère `node:22-bookworm`, source montée en lecture seule, avec `poppler-utils`, `tesseract-ocr` et `tesseract-ocr-fra`. Aucun fournisseur ou service externe n'a été appelé.

## Résultat

`src/knowledge/office-extractor.spec.ts` : **7/7 PASS**.

La preuve couvre XLSX, DOCX, archives actives ou malformées, entités XML, CAD non pris en charge, CSV multiligne et une image PNG réelle. Le cas PNG respecte le seuil de confiance existant et retourne `LOCAL_OCR` avec le texte attendu.

## Interprétation

L'échec Windows initial provenait de l'interdiction locale de créer des sous-processus et, lors d'une première isolation incomplète, de l'absence de Tesseract. Avec les dépendances runtime attendues, la fonctionnalité est validée sans changement produit.
