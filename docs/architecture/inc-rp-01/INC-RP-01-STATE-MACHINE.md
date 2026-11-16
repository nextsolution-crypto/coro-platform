# INC-RP-01 — Machine d'état

Flux nominal :

`DRAFT → SUBMITTED → IN_REVIEW → APPROVED → PUBLISHED → SUPERSEDED | ARCHIVED`

Un rejet ou une correction demandée ne modifie pas la version soumise : une
nouvelle version `DRAFT` est créée. Une publication nouvelle marque l'ancienne
`SUPERSEDED`, sans la supprimer.

## Invariants

- transition avec version attendue et clé d'idempotence;
- création, transition et audit dans une transaction;
- auteur/date imposés serveur;
- approbateur distinct du créateur/soumissionnaire par défaut;
- aucun export probant si pièce jointe requise non `CLEAN`;
- version dont `immutableAt` est défini : contenu, provenance, modèle et
  empreinte non modifiables, y compris par accès direct à PostgreSQL;
- double requête identique : même résultat; requête concurrente incompatible :
  conflit explicite.
