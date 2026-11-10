# DISPLAY-04A-REVIEW — Réseau et secrets

## Observations

Avant correction, le processus interprétant le PDF recevait `DATABASE_URL`, `DO_SPACES_*` et les identifiants QA de stockage. Cette condition était incompatible avec le modèle de menace.

## Preuves

- Variables sensibles détectées dans le rasteriseur corrigé : `[]`.
- DNS externe : échec.
- HTTP/HTTPS : impossible avec `network_mode:none`.
- PostgreSQL et stockage objet : aucune interface réseau dans le namespace.
- Aucun socket Docker et aucun jeton monté.
- Scan des changements pour signatures de clés privées, AWS et secrets assignés : aucune occurrence.

## Tests

Les contrôles utilisent seulement `example.invalid`, `127.0.0.1` et des identifiants synthétiques. Aucune destination CORO sensible ni API externe n'a été contactée.

## Corrections

Le rasteriseur ne reçoit que le chemin du spool et deux drapeaux non sensibles. L'orchestrateur conserve les accès nécessaires et valide le résultat avant stockage.

## Risques résiduels

La configuration Compose doit rester l'autorité de déploiement. Une exécution manuelle omettant `network_mode:none` annulerait la garantie; un test de contrat Compose doit donc rester obligatoire en CI.
