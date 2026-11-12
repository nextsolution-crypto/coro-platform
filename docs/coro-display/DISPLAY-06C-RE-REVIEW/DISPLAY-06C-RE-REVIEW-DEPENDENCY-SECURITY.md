# Dépendances et sécurité

`npm ci` backend, frontend et portail a rapporté 0 vulnérabilité sur leurs arbres installés. Aucun secret de production n’a été utilisé; les clés Ed25519 et mots de passe PostgreSQL sont synthétiques et locaux.

OCR local : BLOCKED, `pdftoppm` absent. Poppler/Tesseract ne sont pas une dépendance du parcours P0 Display. Aucun audit fix ni mise à jour majeure n’a été appliqué.
