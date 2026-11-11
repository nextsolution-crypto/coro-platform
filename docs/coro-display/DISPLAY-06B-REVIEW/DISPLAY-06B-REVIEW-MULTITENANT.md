# DISPLAY-06B-REVIEW — Multitenant

Trois organisations synthétiques A/B/C ont été testées avec appareils, bâtiments, emplacements, affectations et manifestes distincts. Chaque manifeste valide dans sa portée; une substitution B vers A est refusée par `DEVICE_SCOPE_MISMATCH` avant affichage.

L'invitation ne transporte aucune portée modifiable : elle référence le dossier d'appareil serveur. Les contenus secondaires exigent organisation et bâtiment attendus.

Limite : aucun RLS PostgreSQL ni contrôleur HTTP n'est présent dans ce lot. Les tests démontrent les invariants de domaine, pas l'isolation réelle de requêtes ou de tables.
