# Lot de correction — intégrité de révision documentaire

## Modèle additif

- `DocumentReviewRequest` : identité immuable de soumission et décision.
- `DocumentReviewNotificationEvent` : outbox corrélée et état de livraison.
- relations typées vers organisation, projet, document et acteurs internes.
- aucun audit historique réécrit ni hash rétroactif fabriqué.

## Autorité et transaction communes

Les routes `/approval` et leurs alias `/projects` appellent le même service.
Lecture, capacité et mutation dérivent des prédicats canoniques. La transaction
verrouille projet et document, compare version, lockVersion et SHA-256, puis
persiste décision, `ProjectVersion`, transition, audit et outbox. Une reprise
après réponse perdue relit la décision; un contenu modifié exige une nouvelle
soumission.

## Interface

La fiche projet affiche version et empreinte soumises, distingue le retour en
correction et exige son motif. L'état est relu après réponse ambiguë.

## Vérifications

- migrations PostgreSQL 16 : PASS (160);
- correction : PASS, 2 suites / 9 tests;
- builds backend/frontend : PASS;
- Design System : PASS;
- Chrome authentifié : `NOT_VERIFIED`.

Exclusions : PDF final, signature, quorum/affectation de réviseurs, fournisseurs
réels, fusion, release et production.
