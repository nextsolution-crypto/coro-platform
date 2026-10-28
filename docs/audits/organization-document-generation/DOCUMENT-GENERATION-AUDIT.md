# Audit ciblé — génération documentaire CORO

Date d'exécution : 2026-10-28

Branche d'audit : `audit/organization-document-generation`

Worktree : `F:\coro-platform\.worktrees\organization-document-generation`

Version applicative auditée : `0654faeb6ad92e0f6f2a7cfbec1d9fc689fd90f4`

`origin/main` observé : `12766061c5b0458894dd2d0b3b9dac7a161a2296`

## Décision limitée

**NOT_READY_FOR_UNATTENDED_DOCUMENT_GENERATION**.

La génération PMU, PSI et PCA fonctionne sur des données synthétiques et les contrôles tenant/affectation empêchent les opérateurs non autorisés d'atteindre le service. Le parcours ne peut toutefois pas être déclaré robuste pour une utilisation autonome : les projets archivés ou désactivés restent régénérables, les écritures document/projet ne sont pas transactionnelles et deux requêtes concurrentes peuvent créer deux documents pour un même projet.

Cette décision ne remet pas en cause les parcours de consultation, d'édition, d'approbation ou d'export déjà audités séparément. Elle porte uniquement sur la création/régénération de la structure documentaire depuis l'application organisation.

## Portée et méthode

- Inspection du contrôleur, des services, du schéma Prisma et des écrans organisation.
- PostgreSQL 16 jetable sur boucle locale, migrations 1 à 156 appliquées depuis zéro.
- Données strictement synthétiques : deux organisations, trois opérateurs, deux clients, deux bâtiments et des projets PMU/PSI/PCA.
- Tests directs du service avec le vrai client Prisma et la vraie base.
- Régressions unitaires, HTTP et PostgreSQL existantes.
- Aucun fournisseur, stockage externe, courriel, SMS, signature ou opération d'urgence.
- Aucun appel à WEB-AI.

Le navigateur authentifié n'a pas été lancé : aucune image locale ne portait une provenance immuable permettant de la relier au SHA audité. Les observations responsive demeurent donc une revue de code, pas une preuve navigateur.

## Chaîne fonctionnelle réelle

1. Création d'un projet dans `/projects`.
2. Configuration standard dans `/configurator/:projectId`, ou PCA dans `/configurator/pca/:projectId`.
3. Sauvegarde canonique dans `Project.configData` pour PMU/PSI; `PcaConfig` pour PCA.
4. Appel synchrone `POST /generator/generate/:projectId`.
5. Construction de la structure bilingue et écriture dans `Document.content`.
6. Mise à jour du projet à `IN_PROGRESS`, progression 50.
7. Lecture par `GET /generator/document/:projectId`, puis édition dans `/editor/:projectId`.
8. Le PDF est produit plus tard par `POST /projects/:projectId/export`; il ne fait pas partie de la génération initiale.

Il n'existe pas de tâche asynchrone de génération, d'identifiant de job, de file d'attente ni de statut persistant `QUEUED/RUNNING/FAILED`. Le libellé « Génération… » est seulement l'état local de la requête HTTP.

## Types documentaires

| Type | Disponibilité UI | Génération synthétique | Moteur observé |
|---|---:|---:|---|
| PMU | Oui | PASS | Templates TypeScript et procédures en base avec fallback TypeScript |
| PSI | Oui | PASS | Variante du moteur standard, modules adaptés |
| PCA | Oui | PASS | `PcaConfig` et `generatePcaModules` |
| PGC | Non | NOT_VERIFIED | Enum présente, fonctionnalité publique désactivée |
| PRA | Non | NOT_VERIFIED | Enum présente, fonctionnalité publique désactivée |
| PUE | Non | NOT_VERIFIED | Enum présente, fonctionnalité publique désactivée |

## Provenance des données

- Projet, organisation, client, bâtiment et auteur sont relus côté serveur.
- Pour PMU/PSI, `Project.configData` persisté l'emporte intégralement sur le body du navigateur. Le test avec un marqueur obsolète dans le body confirme que celui-ci n'écrase pas la configuration canonique.
- Pour PCA, `PcaConfig` est obligatoire et relu par `projectId`.
- Le body legacy reste accepté sans DTO ni validation de schéma lorsqu'aucune configuration persistée n'existe.
- `buildContext` relit ensuite le projet par identifiant seul, après un contrôle d'accès préalable. Cette séquence est sûre contre l'accès direct dans le flux actuel, mais elle gagnerait à conserver le prédicat d'autorisation dans toutes les lectures.

## Autorisations

- Contrôleur protégé par JWT et `OrganizationStatusGuard`.
- JWT relit l'utilisateur, exige `isActive=true` et une `authVersion` courante.
- ADMIN/SUPER_ADMIN : projets de leur organisation.
- OPERATOR : organisation correcte et projet créé ou modifié par cet opérateur.
- Les tests HTTP/PostgreSQL confirment les refus pour un opérateur non affecté et un autre tenant, sans document, version ni audit additionnel.
- Défaut connexe : `GET /generator/validate/:projectId` ne reçoit que `organizationId`; un OPERATOR de la même organisation mais non affecté peut obtenir des constats dérivés du document. Ce défaut est distinct de la génération mais se trouve dans le même parcours d'écran.

## Résultat produit

La génération initiale produit un enregistrement `Document` contenant les modules FR/EN, la configuration résolue et `generatedAt`. Aucun fichier n'est créé à cette étape; aucune empreinte SHA-256 n'est donc associée à ce résultat. Le PDF ultérieur est renvoyé au navigateur par le service d'export et possède son propre contrôle d'accès.

## Erreurs, reprise et concurrence

- Une erreur HTTP est rendue à l'écran sous forme d'un toast générique; la cause et un identifiant de corrélation ne sont pas affichés.
- Après F5, l'existence d'un document est relue, mais aucun état de génération en cours/échouée n'est récupérable puisqu'il n'existe pas de job persistant.
- L'écriture du document puis la mise à jour du projet ne sont pas dans une transaction. Une panne entre les deux laisse un document présent avec un projet encore `DRAFT` à 0 %.
- `Document.projectId` n'est pas unique et la logique fait `findFirst` puis `create/update`. Deux requêtes concurrentes ont créé deux documents en PostgreSQL.
- Aucun verrou optimiste, idempotency key ou contrainte d'unicité ne protège la génération.

## UX et responsive

Constats de code :

- Le bouton est désactivé dans l'onglet pendant la requête, ce qui limite le double-clic local.
- Cette protection ne couvre ni deux onglets, ni deux acteurs, ni une répétition réseau.
- Le message promet « en quelques secondes » sans timeout ni suivi persistant.
- L'erreur est générique et la nouvelle tentative est possible, mais elle peut aggraver un état partiellement écrit.
- Les bandeaux utilisent une rangée `flex` avec un bouton `flex-shrink-0`, sans bascule explicite en colonne aux petites largeurs; le comportement 320/390 px reste NOT_VERIFIED.
- Aucune preuve Chrome 12/12 ou mesure géométrique n'est revendiquée dans cet audit.

## Tests exécutés

| Test | Résultat |
|---|---|
| `plan-security.spec.ts` | 17/17 PASS |
| `auth-security.spec.ts` + `organization-status.guard.spec.ts` | 12/12 PASS |
| `plan-security.postgres-spec.ts` + `plan-http-security.postgres-spec.ts` | 5/5 PASS |
| runner ciblé document-generation | 8/8 PASS, dont 4 tests de caractérisation de défaut |
| migrations PostgreSQL 16 | 156/156 appliquées |

Les tests de caractérisation sont considérés PASS lorsqu'ils reproduisent de façon déterministe le défaut décrit; ils ne signifient pas que le comportement produit est acceptable.

## Limites

- Pas de recette navigateur traçable au SHA audité.
- Pas de test de PDF dans ce lot, car l'export est un parcours distinct.
- Pas de test de stockage privé : la génération initiale ne crée aucun objet de stockage.
- Pas de test PGC/PRA/PUE : types indisponibles dans l'interface.
- Pas de production mutation ni de vérification sur des données réelles.

## Garde-fous

`PRODUCTION_MUTATION: NO`

`PRODUCT_CODE_CHANGE: NO`

`PUSH_PR_MERGE: NO`

`APPLICATION_DEPLOYMENT: NO`

`WEB_AI_ACTIVATION: NO`

## Addendum — candidat de correction

Baseline de correction : `12766061c5b0458894dd2d0b3b9dac7a161a2296` (`origin/main` et candidat WEB-AI gelé au démarrage du lot).

Branche : `fix/organization-document-generation`.

Le candidat ajoute un prédicat de mutation projet, une transaction PostgreSQL avec recontrôle de l'acteur et de l'affectation, un verrou transactionnel inter-instance, une version documentaire attendue et une autorité persistée de clé d'idempotence. Les lectures d'archives restent autorisées. Aucun stockage ni fournisseur externe n'est appelé par la génération initiale.

Preuves actuelles : 17/17 + 12/12 tests unitaires d'autorisation, 5/5 PostgreSQL/HTTP, 8/8 gouvernance documentaire, builds backend/frontend, Design System, API PMU/PSI/PCA et Chrome 12/12. La suite backend globale obtient 2277 PASS, 2 SKIP et 1 échec environnemental indépendant (`pdftoppm` absent sur Windows); le smoke OCR de l'image backend passe.

Artefacts QA locaux : backend `sha256:9b716185ecf8d88f98a0f36633297b866370df909ebf7dbf8bffd965ceb2a4e1`, frontend `sha256:793faef1d9bca5bc931846362caf02117b4b42c71818b7d8c02f06fe2081b2e4`. Preuves sanitaires sous `D:\CORO-QA\runs\organization-document-generation\2026-10-28`.

`PRODUCT_CODE_CHANGE: YES_CANDIDATE_ONLY`

`PUSH_PR: PENDING_WORKFLOW_REVIEW`

`APPLICATION_DEPLOYMENT: NO`
