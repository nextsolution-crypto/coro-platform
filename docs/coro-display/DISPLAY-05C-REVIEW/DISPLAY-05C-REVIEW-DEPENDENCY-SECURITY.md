# Dépendances et sécurité

Installation réalisée avec les trois lockfiles par `npm ci`. Aucun `audit fix` ni mise à niveau opportuniste.

Au contrôle final du 2026-11-10, `npm audit --omit=dev` et `npm audit` rapportent 0 vulnérabilité connue dans backend, frontend et portail client. Le scan ciblé n’a détecté aucune nouvelle clé privée ni clé d’accès dans les fichiers modifiés.

Les entrées métier rejettent HTML/scripts. Les DTO stricts refusent les champs de mass assignment. Les builds de production passent.
