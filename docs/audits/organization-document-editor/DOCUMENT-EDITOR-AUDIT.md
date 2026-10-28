# Audit et recette de correction — éditeur documentaire CORO

## Traçabilité

- Audit : `2673df4115735409c20316b24dd89333d4eab2fa`.
- Baseline auditée/rapportée en production : `12766061c5b0458894dd2d0b3b9dac7a161a2296`.
- Branche : `fix/organization-document-editor-security`.
- Preuves : `D:\CORO-QA\runs\organization-document-editor\2026-10-28`.
- Stack `editor-fix` : PostgreSQL 16, ports 55474/3170/3171, réseau deny-by-default.
- Image backend QA : `sha256:ede6e51e0a99faf1d4c6fec771a358ac361dfa8df303acbc94c4689ca3674707`.
- Image frontend QA : `sha256:e447bb12e5c5c1a253b46b266e1669695f14849b2f7d37e0cda60d82d06689c9`.

## Architecture

`DocumentEditorIntegrityService` centralise portée, états, verrou transactionnel, version attendue et assainissement. Les endpoints spécialisés le réutilisent; aucun RBAC parallèle. La protection XSS s’applique avant persistance, à la lecture historique, à la restauration et à l’export.

## Résultats

- PMU, PSI et PCA réellement générés et sauvegardés avec données synthétiques.
- Contenu riche légitime préservé; XSS neutralisée et non exécutée après navigation/F5.
- Projet/document immuable : 403; inter-tenant : 404; session révoquée : refus.
- Concurrence : 200/409; versions : liste minimisée et lecture explicite gouvernée.
- Interface immuable sans contrôle d’édition; 12/12 configurations sans débordement.
- `editor-audit.json` : 14 PASS, 0 FAIL; 12 captures réelles.

## Réserves

Route legacy, lecteur d’écran/zoom/focus et pannes réseau 503 non entièrement vérifiés. PGC/PRA/PUE non parcourus. Le modèle canonique n’a pas de rôle documentaire interne « lecture seule ». Aucun contenu historique réel n’est réécrit.

## Gouvernance

- Dépendance PR #116 : aucune.
- PR #115 modifiée : non.
- PR #116 modifiée : non.
- Production mutation : non.
- Application deployment : non.
- WEB-AI activation : non.
