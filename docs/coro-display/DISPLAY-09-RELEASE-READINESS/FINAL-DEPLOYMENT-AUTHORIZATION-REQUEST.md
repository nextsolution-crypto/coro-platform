# Demande groupée minimale avant la demande finale de déploiement

Les preuves techniques sont prêtes dans la PR #270, HEAD `a94097ed`, CI `43424120751` PASS.

Autorisation humaine encore indispensable :

1. fusion contrôlée de la PR d'outillage #270, sans déploiement applicatif;
2. exécution unique du workflow `Production Demo Coro Readiness Inventory` avec `display09_fixture_registration=REGISTER_TOUR_PREMONT_DEMO_FIXTURE`;
3. rejeu strictement READ ONLY du Gate 1A avec `display09_building_identity=RESOLVE_DISPLAY09_BUILDING_READ_ONLY`;
4. exécution unique, strictement READ ONLY, de l'inspection origine avec `display09_origin_inspection=INSPECT_DISPLAY09_ORIGIN_READ_ONLY`.

Ces opérations n'autorisent aucun déploiement, migration Display, DNS/TLS, PDF, emplacement, permission, appareil ou activation iPad. Gate 1B demeure obligatoire après migrations et avant toute publication ou activation.

Après PASS des trois exécutions, la demande finale de déploiement contrôlé pourra être présentée avec des gates frais de capacité, sauvegarde, restauration et rollback.
