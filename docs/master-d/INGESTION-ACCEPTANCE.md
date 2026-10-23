# Ingestion acceptance

Statut : `VALIDATED_E2E_LOCAL`.

## Démontré sur la branche historique

- récupération privée, extraction PDF.js, normalisation, pages/sections/chunks;
- file d'ingestion, idempotence, empreinte d'entrée, reprise et audit;
- index lexical, projection sémantique et pgvector avec fournisseurs synthétiques;
- tests PostgreSQL synthétiques existants.

## Implémentation canonique acceptée

- ProjectFile admissible est la source unique, sans autorité documentaire parallèle;
- téléchargement privé et contrôle SHA-256 avant extraction;
- extraction texte/PDF.js locale, chunks et citations par page/section;
- recherche lexicale et projection sémantique déterministe stockée dans PostgreSQL natif;
- idempotence par version/SHA/pipeline, reprise après échec et aucune projection partielle courante;
- réconciliation `STALE`/`REVOKED` sans suppression de la preuve historique;
- chaîne 151 depuis zéro et upgrade 150→151 validées sur PostgreSQL 16 standard;
- portées ClientUser, Network, tenant, bâtiment et confidentialité résolues côté serveur.

## Critères de passage

OCR image-only : `NOT_IMPLEMENTED_FAIL_CLOSED`. Aucun OCR externe; une source sans contenu extractible échoue avec `NO_EXTRACTABLE_CONTENT`.
