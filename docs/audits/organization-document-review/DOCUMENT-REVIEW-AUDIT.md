# Audit ciblé — révision et approbation documentaire

## Verdict

**FAIL — candidat non admissible à une recette de publication du workflow d'approbation.**

Le verdict porte uniquement sur le candidat non déployé
`fbccdd1c2618a42d967188edbb808eda590e35bf`. La production vérifiée demeure
`0654faeb6ad92e0f6f2a7cfbec1d9fc689fd90f4`; aucune conclusion ci-dessous ne
constitue une preuve de production.

Deux défauts bloquants sont démontrés : la décision n'est pas liée à une
version documentaire immuable, et la création de version / transition du
projet n'est pas atomique. Des défauts d'autorisation permettent en outre à
un opérateur non affecté de créer ou modifier des observations dans son
organisation et permettent la soumission d'un projet archivé.

## Baseline et environnement

| Élément | Preuve |
|---|---|
| SHA exécuté | `fbccdd1c2618a42d967188edbb808eda590e35bf` |
| Branche d'audit | `audit/organization-document-review` |
| Worktree | `.worktrees/organization-document-review` |
| `origin/main` au démarrage | même SHA |
| PostgreSQL QA | `postgres:16-alpine`, localhost `55493`, stockage jetable |
| Migrations | 159, tête `20261112010000_document_editor_integrity`, schéma à jour |
| Données | identités et contenu synthétiques uniquement |
| Communications | simulées; aucun courriel, SMS ou signature réel |
| Production | non consultée ni modifiée pendant les scénarios |

Le lien local `node_modules` utilisé par le worktree pointe vers les
dépendances déjà installées d'un worktree de même dépôt; aucune dépendance ou
version de produit n'a été modifiée.

## Workflow réellement disponible

| État initial | Action réelle | Acteur admis par le serveur | État final | Version / effet |
|---|---|---|---|---|
| tout état sauf `REVIEW` | `POST /approval/:projectId/submit` | acteur ayant `projectAccessWhere` | `REVIEW` | aucun identifiant de document/version; notification asynchrone |
| `REVIEW` | soumission répétée du même auteur | même auteur | `REVIEW` | succès idempotent léger |
| `REVIEW` | `POST /approval/:projectId/approve` | `ADMIN` ou `SUPER_ADMIN`, autre que soumetteur | `VALIDATED` | crée `ProjectVersion`, puis met à jour `Project` séparément |
| `REVIEW`, `VALIDATED`, `EXPORTED` | `POST /approval/:projectId/request-revision` | `ADMIN` ou `SUPER_ADMIN` | `IN_PROGRESS` | motif serveur facultatif; notification asynchrone |
| même organisation | CRUD observations | tout utilisateur authentifié | observation créée/modifiée/supprimée | aucune autorité projet ou permission spécifique |

Il n'existe pas de choix ou d'affectation explicite d'un réviseur. Le « rejet »
de l'interface et le « retour en révision » appellent le même endpoint et
produisent le même état `IN_PROGRESS`. Il n'existe pas de retrait de
soumission distinct.

## Distinctions fonctionnelles

- La qualité/progression affichée par l'interface n'est pas une approbation.
- La soumission change le statut du projet, pas celui d'un `Document` précis.
- L'approbation crée une `ProjectVersion` contenant des métadonnées de décision,
  mais pas le contenu, l'identifiant du document, sa version, son
  `lockVersion` ou son empreinte.
- La génération PDF lancée après approbation est asynchrone et hors de la
  transaction de décision.
- Signature, valeur juridique, export PDF officiel, Knowledge et portail client
  n'ont pas été audités, sauf pour établir cette interaction.

## Méthode et preuves exécutées

1. Revue des contrôleurs, services, modèles Prisma, autorité projet et écran
   projet.
2. Application de la chaîne complète des 159 migrations dans PostgreSQL 16
   jetable.
3. Sept tests de caractérisation unitaires : **PASS 7/7**.
4. Trois scénarios PostgreSQL synthétiques : **PASS 3/3**.
5. Les tests démontrent le comportement actuel; un PASS de caractérisation ne
   signifie pas que ce comportement est acceptable.

Scénarios PostgreSQL démontrés :

- un opérateur non affecté crée une observation sur un projet connu;
- un projet `ARCHIVED` est remis en `REVIEW` par `submit`;
- le contenu du document change après soumission, puis l'approbation réussit
  sans que la version approuvée contienne une identité ou une empreinte de ce
  contenu.

## Types documentaires

| Type | Couverture |
|---|---|
| PMU | scénario PostgreSQL réel synthétique |
| PSI | caractérisation du chemin d'approbation commun |
| PCA | inspection du chemin commun; parcours fonctionnel complet NOT_VERIFIED |

## UX, erreurs et responsive

L'inspection statique confirme les boutons de soumission, observations,
approbation et retour en révision. Elle confirme aussi que `canApprove` peut
afficher ces actions à un `OPERATOR`, alors que la décision serveur lui est
refusée. Le frontend relit l'état après une réponse ambiguë, ce qui limite un
double clic après perte de réponse, mais ne rend pas la décision serveur
atomique.

La campagne navigateur authentifiée (390, 768, 1440, 2560; Classic, Glass
Light, Glass Dark), clavier, zoom 200 % et lecteur d'écran réel est
**NOT_VERIFIED**. Aucun PASS responsive n'est revendiqué.

## Limites

- Aucun backend/frontend complet n'a été exposé à l'extérieur.
- Aucun fournisseur réel n'a été appelé.
- La concurrence PostgreSQL n'a pas été forcée en charge; l'absence de
  transaction est toutefois démontrée par injection d'échec entre les deux
  écritures.
- L'inactivité d'un utilisateur est contrôlée par les mécanismes
  d'authentification/organisation existants, mais le retrait d'accès en cours
  de session n'a pas été démontré de bout en bout.

## Contrôles de mandat

- `PRODUCTION_MUTATION: NO`
- `PRODUCT_CODE_CHANGE: NO`
- `PUSH_PR_MERGE: NO`
- `APPLICATION_DEPLOYMENT: NO`
- `PRODUCTION_WORKFLOW_EXECUTED: NO`
- `WEB_AI_ACTIVATION: NO`
