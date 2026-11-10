# DISPLAY-04A — Stockage et intégrité

Avant conversion : organisation, bâtiment, publication, ProjectFile, version, état APPROVED et SHA-256 exacts sont figés dans le job. Le worker télécharge depuis le stockage privé et recalcule le SHA.

Après conversion : SHA PNG, moteur/version, page, DPI, format, nombre de pages et dimensions sont persistés. Le PNG et la variante SVG DISPLAY-03 sont privés, immuables et sans URL publique permanente. La publication ne référence la variante qu'au sein de la même transaction que la réussite du job.
