# DISPLAY-05A-INTEGRATION — Permissions et multitenant

## Matrice vérifiée

Les tests couvrent absence de `DISPLAY_READ`, lecture seule, `DISPLAY_CONTENT_MANAGE` sans lecture, `DISPLAY_AUDIT_READ`, un ou plusieurs bâtiments, affectation vide, `ADMIN` et `SUPER_ADMIN` sans droit Display. Aucun rôle ne reçoit de permission implicite.

## Cloisonnement

Des organisations, bâtiments, étages, emplacements, sources, publications et événements synthétiques distincts ont été créés. Les accès par organisation étrangère, bâtiment non affecté, UUID, document, emplacement et historique restent refusés ou absents côté serveur.

## Preuves

- Gestionnaire PostgreSQL : 3 tests PASS, incluant pagination/filtre et bâtiment étranger.
- HTTP/spatial PostgreSQL : 7 tests PASS.
- Gouvernance DISPLAY-03 PostgreSQL : PASS.
- Session initiale : droits et bâtiments exposés sans accorder de privilège.

## Risque résiduel

La matrice n'a pas été rejouée par clics. Elle est toutefois exécutée sur les services réels et PostgreSQL, pas seulement sur le frontend.
