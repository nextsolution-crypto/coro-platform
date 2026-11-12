# DISPLAY-06C-PR — PostgreSQL

Validation locale : PostgreSQL 16 jetable, 185 migrations appliquées, seconde passe idempotente réussie. Les suites PostgreSQL générales ont produit 80 suites / 429 tests réussis lorsque `TEST_DATABASE_URL` pointait explicitement sur l’instance isolée.

Validation CI : le job `backend-tests` du run `43140951448` a appliqué les migrations avant les tests, puis a exécuté les tests d’intégration PostgreSQL. Aucun schéma ou contenu de production n’a été touché.

Les preuves couvrent notamment les contraintes de tenant, l’enrôlement, les appareils, les événements, les confirmations de synchronisation et les états de cache. Les tests locaux Knowledge dépendant d’outils PDF ont été remplacés par la preuve CI avec runtime OCR installé.
