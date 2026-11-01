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
- Image frontend du candidat reconstruite avec TypeScript et build Next.js : `PASS`.
- PostgreSQL 16 jetable, 164 migrations et backend/frontend réels : `PASS`.

## Acceptation intégrée Chrome — PR #144

- Candidat de départ : `8b10b4973392477efa51d00b9c6dd7d21a913ef1`.
- Correctif découvert pendant la recette : état accessible et explicite « Aucun résultat dans cette catégorie. » au lieu d'une zone vide.
- Provenance des images QA : images construites directement depuis le worktree de la PR, avec étiquette `org.opencontainers.image.revision`; frontend reconstruit après le correctif ciblé.
- Données : organisations, projets, acteurs, code incident, rôle et procédure exclusivement synthétiques.
- Réseau : services applicatifs sur réseau Docker interne; ports publiés uniquement sur loopback; MFA capturé localement; aucun fournisseur externe.

La matrice `390×844`, `768×1024`, `1440×900`, `2560×1440` × Classic, Glass Light et Glass Dark est `12/12 PASS`. Les captures ont été inspectées aux tailles mobile, desktop et large desktop. Aucun débordement horizontal, contrôle tronqué ou erreur console critique n'a été observé.

Contrôles navigateur `PASS` :

- chargement des trois catégories et consultation d'une procédure longue;
- recherche accentuée et état sans résultat;
- mention explicite du catalogue global en lecture seule;
- panne complète et panne partielle déterministes, alerte `role=alert`, reprise sans faux succès;
- F5 et conservation de session;
- navigation clavier et focus visible;
- zoom 200 % sans débordement.

Preuves locales assainies :

- `D:\CORO-QA\tracking\organization-library\pr144-qa1\browser\organization-library-browser.json`;
- douze captures PNG dans le même dossier;
- `D:\CORO-QA\tracking\organization-library\pr144-qa1\api-acceptance.json`;
- `D:\CORO-QA\tracking\organization-library\pr144-qa1\inactive-project.json`.

## Parcours d'autorisation intégrés

| Scénario | Résultat |
|---|---|
| Lecture contextualisée du projet affecté | `PASS` — HTTP 200 |
| Acteur hors affectation | `PASS` — HTTP 404 |
| Autre organisation | `PASS` — HTTP 404 |
| Personnalisation autorisée et relecture persistée | `PASS` — HTTP 200/200 |
| Mutation sur projet archivé | `PASS` — HTTP 403 |
| Mutation sur projet inactif | `PASS` — HTTP 404 |
| Mutation inter-tenant | `PASS` — HTTP 404 |
| Mutations du catalogue global | `PASS` — HTTP 403/403 |

La vérification PostgreSQL après refus donne zéro écriture interdite dans `Procedure` et zéro override contenant le marqueur de refus. L'unique override synthétique attendu est celui du parcours autorisé. Le projet temporairement désactivé a été remis dans son état actif après la preuve.

## Limites

- Les contenus historiques de la table `Procedure` sont conservés; leur inventaire/migration nécessite une décision séparée si une source administrable globale est souhaitée.
- Le catalogue n’est pas et ne devient pas une bibliothèque ProjectFile.
- Aucun fournisseur IA réel n’est appelé.
- Knowledge : `NON_CONNECTÉ`.
- CORO AI authentifié : `NON_CONNECTÉ`.
- Assistant public : `NON_CONNECTÉ` au catalogue; son corpus public demeure isolé.
- Le lecteur d’écran réel demeure `NOT_VERIFIED` : aucun runtime fiable n'était disponible. Les rôles, alertes et parcours clavier ont été vérifiés dans le DOM et Chrome, sans les présenter comme une restitution vocale.

## Verdict

`ACCEPTATION_INTÉGRÉE_PASS`

Ce verdict couvre le catalogue Bibliothèque et ses autorisations sur le candidat de la PR #144. Il n'ajoute aucun raccordement IA et ne vaut ni fusion, ni déploiement.
