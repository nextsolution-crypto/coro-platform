# CORO WEB-AI-02 — Release Acceptance

Date : 2026-10-27

Branche source : `feature/web-ai-02-public-knowledge`

Pull Request : [#109](https://github.com/nextsolution-crypto/coro-platform/pull/109)

SHA fusionné et déployé : `8451ce11c521db9520553c3f1dac2a4da4e724a7`

## Verdict

**VALIDÉ, FUSIONNÉ ET DÉPLOYÉ EN PRODUCTION AVEC LE MOTEUR PUBLIC DÉSACTIVÉ.**

La fondation Public Knowledge, sa migration additive et ses contrôles d’isolation sont en production. La recherche publique n’est pas activée. Aucun appel Bedrock, Anthropic ou autre fournisseur IA réel n’a été effectué.

## Contenu livré

- modèles et migration Public Knowledge;
- corpus public bilingue gouverné de 38 sources;
- ingestion et synchronisation versionnées;
- dépublication et révocation;
- recherche hybride déterministe;
- citations canoniques et contrats API versionnés;
- feature flag désactivé par défaut;
- identité SQL publique dédiée obligatoire lors d’une future activation;
- tests de privilèges SQL minimaux et guide d’activation;
- documentation d’architecture, de sécurité et d’évaluation.

Commits fonctionnels :

- `d42b15dc` — schéma et migration;
- `3235e799` — récupération Public Knowledge;
- `ec5f4f58` — documentation;
- `5829ceb4bb58548531f963bb3d23e911c23f2333` — identité SQL publique dédiée et fail-closed.

## Isolation SQL

L’API de recherche utilise `PublicKnowledgeDatabaseService` et exige `PUBLIC_KNOWLEDGE_DATABASE_URL` lorsque `WEB_AI_PUBLIC_KNOWLEDGE_ENABLED=true`. Une activation sans identité dédiée échoue avec `PUBLIC_KNOWLEDGE_DATABASE_URL_REQUIRED`.

Le test PostgreSQL démontre qu’un rôle runtime public minimal :

- peut lire les sources et segments publics;
- ne peut pas lire `ProjectFile`;
- ne peut pas modifier les tables publiques;
- ne reçoit aucun privilège tenant par le chemin Public Knowledge.

En production, l’identité SQL runtime publique n’a pas été provisionnée, car le moteur demeure désactivé. Son provisionnement, son secret et la preuve de ses privilèges seront des gates obligatoires avant toute activation future.

## Migration

- chaîne depuis zéro : **156/156 migrations appliquées** sur PostgreSQL 16;
- mise à niveau représentative : **155 → 156 réussie**;
- fixture synthétique antérieure préservée;
- migration additive, sans suppression de donnée;
- production : `migrationCount=156`, `failedMigrations=0`;
- head actif : `20261110010000_public_knowledge_foundation`;
- PostgreSQL production : `16.15`, santé confirmée.

## Tests avant fusion

- Public Knowledge unitaires/HTTP : **19/19 PASS**;
- PostgreSQL ciblé : **5/5 PASS**, incluant l’isolation SQL;
- évaluation documentaire : **Recall@5 100 % sur 50 questions**;
- backend complet local : **2220 PASS, 2 SKIP, 1 réserve locale OCR**;
- backend chat/Knowledge : **87 PASS**, même réserve OCR locale;
- backend build et TypeScript : **PASS**;
- ESLint ciblé : **PASS**;
- site : **713/713 PASS**;
- site TypeScript et build : **PASS**;
- audit npm de production du site : **0 vulnérabilité**;
- `git diff --check` : **PASS**.

La réserve OCR locale provenait de l’absence de `pdftoppm`. Le pipeline CI a installé le runtime OCR et a validé les tests backend, PostgreSQL, corpus synthétique et extraction PDF compilée.

Réserves historiques hors diff : lint global du site et du backend dans des fichiers non modifiés, ainsi que dix avis `npm audit` backend préexistants. Ces éléments n’ont pas été masqués ni attribués à WEB-AI-02.

## Pull Request et CI

La PR #109 a été fusionnée le 2026-10-27 après succès des contrôles obligatoires :

- Backend security;
- backend-tests;
- TypeScript backend, frontend, site et Client Portal;
- build Docker du site;
- build du Client Portal.

État de fusion : `CLEAN`. SHA de fusion : `8451ce11c521db9520553c3f1dac2a4da4e724a7`.

## Release gouvernée

Workflow : [Validate and Release Production #40589250069](https://github.com/nextsolution-crypto/coro-platform/actions/runs/40589250069) — **SUCCESS**.

Le workflow a validé l’ensemble immuable suivant :

- backend : `sha256:245492d98a1804fccdeaf32adf2e62c445bfde48cb0f196531bc5806315ce246`;
- frontend : `sha256:146e06c12ba1863055d52c49dbbb3f9ff828849a020391684e0a5ff878709fca`;
- Client Portal : `sha256:fcfe6621b8e7c75f3f8706b811c3918b51d83ff63da1e646ccaec5bda8328f80`;
- site : `sha256:30ac45fd9616524ee00ecbb6db1a9a23fe9b27bdda06d72db96e378dd259aa96`.

Le manifeste de release rapporte :

- release `production-8451ce11c521db9520553c3f1dac2a4da4e724a7` : **SUCCESS**;
- réconciliation : **SUCCEEDED / COMPLETED**;
- sauvegarde : **REMOTE_VERIFIED**, SHA-256 distant vérifié et VersionId présent;
- restauration : **RESTORE_VERIFIED**;
- quatre images de rollback disponibles;
- verrou de déploiement libre après exécution.

## Inspection post-release

Workflow en lecture seule : [Inspect Production Read Only #40590640725](https://github.com/nextsolution-crypto/coro-platform/actions/runs/40590640725) — **PASS / GO**.

Constats :

- SHA actif exact : `8451ce11c521db9520553c3f1dac2a4da4e724a7`;
- quatre conteneurs applicatifs actifs sur les quatre digests attendus;
- aucun redémarrage de conteneur;
- PostgreSQL actif et sain;
- migration 156 active, aucun échec de migration;
- sauvegarde distante et restauration vérifiées;
- espace disque production : 76 % utilisé lors de l’inspection;
- aucun problème signalé par l’inspection;
- release readiness : `GO`.

## Feature flag et exposition publique

Le déploiement conserve explicitement :

`WEB_AI_PUBLIC_KNOWLEDGE_ENABLED=false`

Le 2026-10-27, une requête non mutante conforme au contrat vers `POST /api/public-knowledge/v1/search` a reçu **HTTP 503**, confirmant `PUBLIC_KNOWLEDGE_DISABLED`. Une requête initiale volontairement invalide a été rejetée HTTP 400 par la validation du DTO. Aucun résultat documentaire et aucun appel fournisseur IA n’ont été produits.

## Rollback

Le rollback gouverné repose sur le manifeste de release précédent, ses quatre images immuables protégées et le checkpoint de base vérifié. La release confirme `rollbackImagesAvailable=4`. Aucun rollback n’a été nécessaire.

## Réserves et gates avant activation future

- identité SQL publique à créer en production avec les privilèges minimaux testés;
- secret `PUBLIC_KNOWLEDGE_DATABASE_URL` à provisionner par l’autorité de secrets;
- synchronisation initiale du corpus à exécuter et contrôler;
- activation publique à autoriser séparément;
- WEB-AI-03 à implémenter et accepter avant conversation fondée sur le corpus;
- fournisseur réel, budget, rétention et traitement des données à approuver séparément;
- aucune preuve Bedrock réelle n’est revendiquée.

## Conclusion

WEB-AI-02 est livré comme fondation inactive et réversible. Les migrations, l’isolation applicative et SQL, la CI, la release, la restauration, les digests et l’état de production sont démontrés. Le site et le backend restent indépendants du moteur public désactivé.
