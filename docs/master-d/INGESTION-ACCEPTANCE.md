# Ingestion acceptance

Statut : `PARTIAL_ARCHITECTURE_REUSE_REQUIRED`.

## Démontré sur la branche historique

- récupération privée, extraction PDF.js, normalisation, pages/sections/chunks;
- file d'ingestion, idempotence, empreinte d'entrée, reprise et audit;
- index lexical, projection sémantique et pgvector avec fournisseurs synthétiques;
- tests PostgreSQL synthétiques existants.

## Non accepté

- la source est une autorité Knowledge parallèle plutôt que ProjectFile;
- aucun OCR réel pour documents numérisés;
- aucune preuve de réconciliation directe ProjectFile superseded/revoked/expired;
- migrations historiques non rebasées sur la chaîne 150;
- aucune validation E2E du stockage privé ProjectFile vers index;
- zone, équipement, confidentialité et portée ClientUser non démontrés.

## Critères de passage

Ingestion uniquement depuis un ProjectFile admissible; contrôle SHA-256; transaction/idempotence; échec sans index partiel courant; reindexation sur changement de version; purge ou désactivation atomique sur révocation/remplacement/expiration; audit sans contenu sensible; aucun fournisseur externe pendant QA.
