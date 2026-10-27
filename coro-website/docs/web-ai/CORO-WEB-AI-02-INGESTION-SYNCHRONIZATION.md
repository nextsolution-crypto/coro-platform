# CORO WEB-AI-02 — Ingestion et synchronisation

## Fonctionnement

La source d'ingestion est un catalogue TypeScript serveur relu, pas un crawler. Chaque entrée est normalisée, validée, hachée en SHA-256, découpée et indexée. La mise à jour est transactionnelle : la référence courante n'est modifiée qu'après validation et écriture réussies.

- contenu identique : mise à jour des métadonnées, version inchangée;
- contenu modifié : version incrémentée, chunks remplacés dans une transaction;
- source omise lors d'une réconciliation : `UNPUBLISHED`, retirée de l'index courant;
- révocation : `REVOKED`, `revokedAt`, retrait de l'index;
- échec : événement de synchronisation `FAILED`, code borné, pas de contenu sensible;
- nouvelle exécution : idempotente.

La commande exige une confirmation explicite et réconcilie tout le catalogue. Son exécution sans confirmation échoue fermée avec `PUBLIC_KNOWLEDGE_SYNC_CONFIRMATION_REQUIRED`.

## Validation

- migration complète depuis une base vide : 156/156 migrations appliquées sur PostgreSQL 16;
- première synchronisation : 38 sources créées;
- deuxième synchronisation : 38 inchangées;
- retrait, restauration et révocation exercés;
- aucune source privée acceptée;
- URL externe, route API privée et incohérence de langue refusées.
