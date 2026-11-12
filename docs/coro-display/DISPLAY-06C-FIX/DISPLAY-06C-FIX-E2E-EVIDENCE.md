# Preuves E2E

Le scénario courant est décrit par `evidence/scenario.json`. Il contient les identifiants synthétiques d'appareil, d'affectation et de publication, la séquence, le SHA-256 du rendu, le statut confirmé et l'instant du heartbeat.

Captures du même scénario :

- `evidence/online.png` : rendu téléchargé et activé;
- `evidence/offline.png` : rendu après arrêt du Gateway;
- `evidence/restart.png` : rendu après restauration du cache;
- `evidence/emergency.png` : rendu prioritaire pendant l'urgence synthétique.

Les données sont exclusivement synthétiques et `physicalDisplayProof` reste faux.
