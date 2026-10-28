# Lot de correction proposé — génération documentaire

Ce lot a été autorisé et implémenté sur `fix/organization-document-generation`. Il ne constitue pas une autorisation de fusion ou de déploiement.

## Lot 1 — Autorité et état métier

1. Créer un prédicat d'opération de génération réutilisant `projectAccessWhere(actor)` et exigeant `isActive=true`, `status != ARCHIVED`.
2. Appliquer le même contrôle à la génération, la configuration, la validation et toute régénération PCA.
3. Conserver la lecture des archives selon la politique existante; bloquer uniquement les mutations.
4. Ajouter les tests ADMIN, OPERATOR affecté, OPERATOR non affecté, autre tenant, projet archivé, projet désactivé.

## Lot 2 — Atomicité, unicité et idempotence

1. Décider explicitement qu'un projet possède une seule autorité `Document` courante.
2. Ne pas altérer les anciens documents : ajouter une autorité de requête idempotente unique par projet et échouer explicitement si plusieurs documents historiques sont détectés.
3. Sérialiser les écritures par verrou transactionnel PostgreSQL et version attendue.
4. Inclure la transition du projet dans la même transaction.
5. Ajouter un verrou optimiste ou une clé d'idempotence pour les appels concurrents.
6. Préserver l'historique via `ProjectVersion`, pas par des lignes `Document` concurrentes.

## Lot 3 — Contrat et observabilité

1. Versionner et valider le DTO de configuration legacy.
2. Retourner un `requestId`, le document courant et sa version.
3. Journaliser début/succès/échec avec acteur, projet, version de configuration et corrélation, sans contenu sensible.
4. Donner à l'interface un message d'erreur exploitable et une action de reprise sûre.

## Lot 4 — UX et recette

1. Adapter les bandeaux à une colonne sur petits écrans.
2. Tester deux onglets et deux acteurs en concurrence.
3. Tester timeout, erreur DB après écriture simulée, F5 et nouvelle tentative.
4. Mesurer 320, 390, 768, 1024, 1440 et 1920 px.
5. Confirmer que le résultat ouvert dans l'éditeur correspond à l'unique document/version retourné.

## Gates d'acceptation

- Zéro mutation sur archive/inactif.
- Zéro document sur refus d'autorisation.
- Zéro état partiel après panne injectée.
- Une seule ligne `Document` après des appels concurrents issus d'instances indépendantes.
- Version et corrélation stables lors d'une répétition idempotente.
- Validation et lecture soumises au même périmètre que la génération.
- Recette navigateur traçable au SHA candidat.
