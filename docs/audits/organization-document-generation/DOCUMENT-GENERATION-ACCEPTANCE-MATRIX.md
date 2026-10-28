# Matrice d'acceptation — génération documentaire

| Capacité | PMU | PSI | PCA | Preuve / remarque |
|---|---|---|---|---|
| Configuration canonique persistée | PASS | PASS | PASS | `Project.configData` ou `PcaConfig` |
| Génération synthétique autorisée | PASS | PASS | PASS | PostgreSQL 16, runner ciblé |
| Structure bilingue persistée | PASS | PASS | PASS | `Document.content.modules_fr/modules_en` |
| Projet à 50 % / IN_PROGRESS | PASS | PASS | PASS | Vérification DB |
| Refus opérateur non affecté | PASS | PASS | PASS | Tests HTTP/PostgreSQL existants et ciblés |
| Refus inter-tenant | PASS | PASS | PASS | Aucun document additionnel |
| Utilisateur désactivé | PASS | PASS | PASS | JWT relit `isActive`; régression dédiée |
| Organisation désactivée | PASS | PASS | PASS | `OrganizationStatusGuard`; régression dédiée |
| Projet archivé immuable | PASS | PASS | PASS | DG-001 corrigé; HTTP 409, zéro effet |
| Projet `isActive=false` immuable | PASS | PASS | PASS | DG-002 corrigé; HTTP 409, zéro effet |
| Atomicité document/projet | PASS | PASS | PASS | DG-003 corrigé; rollback injecté |
| Idempotence/concurrence | PASS | PASS | PASS | DG-004 corrigé; verrou PostgreSQL + version attendue |
| Validation scoped à l'affectation | PASS | PASS | PASS | DG-005 corrigé |
| Identifiant de tentative/corrélation | PASS | PASS | PASS | `DocumentGenerationRequest`, clé idempotente |
| Reprise après panne | PASS | PASS | PASS | Même clé = même résultat; charge incompatible = 409 |
| F5 après génération | PASS | PASS | PASS | Résultat relu; aucune promesse de job asynchrone |
| PDF exploitable | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | Export aval distinct |
| Stockage privé | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | Aucun fichier créé lors de la génération initiale |
| Responsive navigateur | PASS | PASS | PASS | Chrome authentifié 12/12, artefacts locaux par digest |

## Types non publiés

PGC, PRA et PUE sont présents dans l'enum mais désactivés dans la création de projet. Ils restent **NOT_VERIFIED** et ne doivent pas être présentés comme générateurs disponibles.

## Verdict

Le candidat corrigé est acceptable pour revue : PMU, PSI et PCA passent en API réelle et navigateur QA isolé. PGC, PRA et PUE, l'export PDF aval et la conformité juridique demeurent hors de cette conclusion.
