# Audit ciblé — fiche projet organisation

## Décision

**CORRECTION REQUISE AVANT UTILISATION pour les acteurs organisation ayant accès à la fiche projet.**

L'écran identifie correctement un projet autorisé et conserve la lecture seule d'une archive, mais trois défauts serveur permettent respectivement une fuite d'indicateur, la lecture directe d'un projet désactivé et la création d'un rattachement client/bâtiment inter-organisation. La fiche est en outre inutilisable à 390 px pour plusieurs actions visibles et présente toute panne principale comme un projet inexistant.

Cette décision concerne uniquement `/projects/[id]`. Elle ne vaut pas acceptation des éditeurs, documents, signatures, fichiers, Knowledge, activités, procédures ou mandats accessibles depuis cet écran.

## Référentiel et environnement

- SHA source examiné : `2ff9db7b0858a12dd0119e8109efc02ffc392522`.
- `origin/main` lors de l'audit : même SHA.
- Déploiement GitHub production et inspection read-only : SHA `2ff9db7b0858a12dd0119e8109efc02ffc392522`, workflows `40415529076` et `40417223581` terminés avec succès.
- Worktree : `.worktrees/organization-project-detail-audit`, branche `audit/organization-project-detail`.
- QA : PostgreSQL 16 jetable, 155 migrations, backend et frontend réels compilés depuis le SHA audité, MFA locale, stockage privé simulé et réseau deny-by-default.
- Production : vérification de provenance GitHub uniquement; aucune mutation et aucune consultation de données métier.
- Preuves volumineuses : `D:\CORO-QA\audits\organization-project-detail\2026-10-26`.

## Structure réelle de l'écran

La fiche ne comporte pas d'onglets internes. Elle présente successivement :

1. retour à la liste;
2. en-tête avec type, nom, statut, client, bâtiment et année;
3. barre d'actions (journal, activités, modèle, procédures, mandat, archivage, désactivation et actions d'approbation selon l'état);
4. prochaine étape et progression;
5. trois étapes documentaires;
6. score qualité si calculé;
7. export, engagement, versions, fichiers et observations selon l'état;
8. carte « Informations du projet ».

L'écran n'offre pas de modification générale, d'affectation de responsable, d'échéance ou de duplication. Les actions réellement immédiates dans le périmètre sont l'archivage, la désactivation, l'ouverture des modales et la navigation vers les sous-écrans.

## Sources et calculs

| Donnée | Source | Conclusion |
|---|---|---|
| identité, client, bâtiment, responsable | `GET /projects/:id` | portée canonique appliquée pour un projet actif/archivé, mais `isActive` absent du filtre |
| progression | colonne `Project.progress` | valeur persistée affichée directement; seuils UI 25/50/100; aucune date de fraîcheur |
| qualité | `GET /projects/:id/quality-score` | calcul documentaire détaillé, mais seulement borné par `organizationId`, pas par `projectAccessWhere(actor)` |
| statut | `Project.status` | libellé clair; archives consultables et mutations génériques refusées |
| dates | seul `year` est affiché | création, dernière modification et échéance absentes; aucune échéance au modèle `Project` |
| responsables | relation unique `Project.user` | aucun multi-responsable sur ce modèle |

Le zéro de progression n'est pas distingué d'une valeur non calculable. Une panne de qualité est silencieuse et devient une zone absente. Ces ambiguïtés ne permettent pas d'affirmer que tous les indicateurs sont frais et interprétables.

## Accès vérifiés

- OPERATOR affecté, lecture directe du projet actif : **PASS**.
- ADMIN organisation A, lecture organisationnelle : **PASS** lors des mutations concurrentes synthétiques.
- OPERATOR non affecté, lecture directe : **PASS**, HTTP 404.
- acteur organisation B et ADMIN organisation B : **PASS**, HTTP 404.
- utilisateur désactivé : authentification refusée par le harnais permanent (preuve de fondation; non recomptée comme recette de détail).
- archive : lecture **PASS**, boutons de mutation absents, `PUT` direct refusé HTTP 403.
- substitutions `organizationId` et `userId` : **PASS**, HTTP 403.
- substitution `clientId` + `buildingId` inter-organisation : **FAIL**, HTTP 200; fixture restaurée immédiatement.

## Fonctionnement et résilience

- liste → fiche, URL directe, F5 et retour navigateur : **PASS**.
- 9/12 configurations responsive : **PASS** (768, 1440 et 2560, trois thèmes).
- 3/12 configurations à 390 × 844 : **FAIL**; actions hors écran et cartes des étapes comprimées.
- aucun débordement global mesuré, ce qui confirme que le contrôle global seul aurait masqué le défaut composant.
- panne 503 du chargement principal : **FAIL**; « Projet introuvable », sans alerte ni reprise.
- concurrence : **FAIL**; deux écritures obsolètes réussissent et la seconde écrase silencieusement la première.
- erreurs console critiques pendant la matrice : **PASS**, zéro.

## Limites de preuve

Restent **NOT_VERIFIED** : navigation clavier exhaustive, focus de chaque modal, cible tactile de chaque commande, longue adresse réellement persistée, champ facultatif absent sur toutes les relations, réponse secondaire lente, perte d'affectation pendant une page ouverte, expiration de session au milieu d'une mutation, double soumission d'archivage/désactivation, reprise après échec d'enregistrement et réponse tardive après navigation rapide. Les sous-écrans et opérations documentaires n'ont pas été exercés en profondeur conformément au mandat.

## Fichiers et références principales

- UI : `coro-frontend/app/projects/[id]/page.tsx:148-204,445-448,520-657,1022-1078,1421-1436,1686-1730`.
- portée projet : `coro-backend/src/auth/project-access.ts:10-25`.
- lecture/mutation : `coro-backend/src/projects/projects.service.ts:84-100,175-214`.
- qualité : `coro-backend/src/projects/projects.controller.ts:75-81`; `projects.service.ts:470-481`.
- modèle : `coro-backend/prisma/schema.prisma:2479-2527`.
- runner reproductible : `qa/global-e2e/src/organization-project-detail-audit.mjs`.

## Conclusion limitée

L'écran n'est pas utilisable en l'état pour un pilote organisation autonome tant que les rattachements inter-organisation et les lectures indirectes/directes incohérentes ne sont pas corrigés. Les écrans desktop/tablette peuvent être démontrés sous accompagnement, sans mutation générique de rattachement et sans présenter les indicateurs ou les états d'erreur comme définitivement validés.
