# Correction intégrée du catalogue Bibliothèque

## Candidat

- Branche : `fix/organization-library-catalog`
- Base : audit `e04502c7`, lui-même basé sur `origin/main` `65f58ddb10b3eb61878627d33bb5befc385499df`
- Migration : aucune
- Production : aucune modification

## Autorités de contenu

| Contenu | Autorité | Portée | Mutation retenue |
|---|---|---|---|
| Codes incidents | `IncidentCode` | globale | aucune dans `/library` |
| Rôles | `Role` | globale | aucune dans `/library` |
| Procédures officielles affichées par `/library` | registre versionné `getAllProcedures()` | globale | lecture seule |
| Procédures par défaut de l’éditeur | `ProcedureDefault` | globale | routes SUPER_ADMIN existantes |
| Personnalisation d’organisation | `ProcedureOverride(projectId=null)` | organisation | autorité administrative existante |
| Personnalisation de projet | `ProcedureOverride(projectId)` | projet | projet accessible, actif et mutable |
| Procédures personnalisées | `CustomProcedure` | organisation ou projet | parent projet canonique; gestion organisationnelle ADMIN/SUPER_ADMIN |

Les anciennes routes `POST /library/procedures` et `PUT /library/procedures/:id` écrivaient dans `Procedure`, alors que la lecture provenait du registre TypeScript. Elles restent compatibles au niveau URL mais échouent désormais explicitement avec 403. Cela supprime le faux succès sans migrer ni détruire les anciennes lignes.

## Corrections

1. Les mutations globales ambiguës de `/library` sont refusées par défaut.
2. `GET /procedures/project/:projectId` et `GET /procedures/:id?projectId=...` utilisent `projectAccessWhere(actor)` avant toute lecture d’override.
3. Les lectures, générations, imports, duplications et mutations de `custom-procedures` héritent de l’autorité du projet parent.
4. Les projets archivés ou désactivés restent consultables lorsqu’autorisés, mais leurs mutations sont refusées par `mutableProjectAccessWhere`.
5. Une procédure d’organisation exige ADMIN/SUPER_ADMIN; les champs modifiables sont explicitement mappés.
6. `/library` annonce un catalogue global en lecture seule, ajoute une recherche locale et affiche les pannes partielles avec une alerte accessible et une reprise.

## Knowledge et assistants

Question synthétique utilisée : une procédure contenant exclusivement le marqueur `QA-ONLY-LIBRARY-PROCEDURE-ZEPHYR-4817`.

| Consommateur | Chemin réel | Résultat |
|---|---|---|
| CORO Knowledge | `ProjectFileKnowledgeChunk` issu de ProjectFile approuvé | `NON_CONNECTÉ` |
| CORO AI authentifié | `CoroAiService` → `KnowledgeRetrievalService` → chunks ProjectFile | `NON_CONNECTÉ` |
| Assistant public | `PublicKnowledgeSource`, corpus public séparé | `NON_CONNECTÉ` au catalogue, isolation confirmée |

Le test de contrat confirme que le marqueur synthétique n’est récupéré ni avant, ni après simulation de modification/retrait, car aucune de ces surfaces ne lit `ProcedureDefault`, `CustomProcedure`, `IncidentCode` ou `Role`. La présence en base ne vaut donc pas indexation. Aucun raccordement n’a été ajouté dans ce lot.

Complément futur possible : un adaptateur d’ingestion distinct, versionné et révocable, avec identifiant de source, portée GLOBAL/ORGANIZATION/PROJECT, provenance, contrôle d’autorisation avant recherche et citation, retrait immédiat, et exclusion structurelle du corpus public pour tout contenu privé/personnalisé.

## Tests

- Contrats Bibliothèque : 5 scénarios.
- Connectivité Knowledge/AI/public : 4 scénarios.
- Autorisations backend ciblées : routes globales, lecture projet et custom procedures.
- Builds backend/frontend et recette PostgreSQL/Chrome : à reporter après exécution terminale du candidat exact.

## Limites

- Les contenus historiques de la table `Procedure` sont conservés; leur inventaire/migration nécessite une décision séparée si une source administrable globale est souhaitée.
- Le catalogue n’est pas et ne devient pas une bibliothèque ProjectFile.
- Aucun fournisseur IA réel n’est appelé.
- Le lecteur d’écran réel demeure `NOT_VERIFIED` s’il n’est pas disponible.
