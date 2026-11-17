# INC-RP-01 — Lots 3 et 4 — Sécurité

- Toutes les routes métier exigent JWT, organisation active, permission individuelle et affectation Incident au bâtiment.
- Les modèles, rapports, versions, approbations et pièces jointes restent liés par `organizationId`.
- Le créateur/soumissionnaire ne peut jamais approuver sa propre version.
- Les décisions et publications utilisent verrou optimiste, transaction sérialisable et clés d’idempotence.
- Une version soumise, approuvée ou publiée n’est pas modifiée; une correction produit une nouvelle version.
- Les pièces jointes sont stockées dans le stockage privé immuable. La clé de stockage n’est pas rendue au client.
- MIME permis: PDF, JPEG et PNG; taille maximale 10 Mo; SHA-256 et provenance conservés.
- Le téléchargement exige `scanStatus=CLEAN`, absence de révocation et autorité de lecture courante.
- Le scanner antivirus est obligatoire et échoue fermé s’il est absent, indisponible ou ambigu.
- Les valeurs Reportperfect non mappées restent dans `legacyPayload`/`ExternalSourceReference`; aucune perte silencieuse.
- Le feature flag reste désactivé par défaut et aucune permission n’est attribuée implicitement.
