# Audit ciblé — écran Clients CORO

## Baseline

- Branche isolée : `audit/organization-clients`.
- SHA audité : `cefdf1e6db37ad79fd511156cca574d083ce7cb4`.
- Production observée : même SHA, inspection post-release PASS/GO `41074753534`.
- PostgreSQL : 16.15, 162 migrations, tête `20261115010000_timelog_integrity`.
- Aucun code produit ni environnement de production modifié.

## Périmètre constaté

L’écran organisation expose la liste `/clients`, la fiche `/clients/[id]`, la création, la modification, le logo, la désactivation, les compteurs, les rattachements bâtiments/projets, le portefeuille et l’administration de permissions opérationnelles. La recherche, les filtres, le tri utilisateur, la pagination et les actions groupées ne sont pas implémentés.

Un Client est une ressource de l’organisation qui regroupe bâtiments, projets et `ClientUser`. Le contact principal est aussi une autorité d’accès : lorsqu’une adresse est fournie, le serveur tente de créer automatiquement un `ClientUser` `CLIENT_CORPORATE`, génère un secret temporaire et appelle l’adaptateur d’invitation. L’interface de fiche l’indique, mais la modale de création ne décrit pas suffisamment l’opération externe et ses échecs partiels.

## Résultat

La création reprend le contrôle de #94 : rôle administrateur et organisation issue du serveur. La cohérence liste/lecture directe inter-organisation est assurée par `organizationId`. Toutefois, trois mutations restent accessibles à tout JWT interne de l’organisation, la modification accepte un payload Prisma non fermé et le provisionnement/invitation n’est ni atomique ni idempotent. Ces défauts bloquent l’acceptation de l’écran.

## Méthodes et limites

- Lecture du code, historique #94/#95, tests backend existants et runner de caractérisation.
- Observation de production limitée à l’inspection gouvernée déjà exécutée sur le même SHA.
- Le moteur Docker local est disponible (`29.9.2`), mais ce worktree neuf ne contient ni `coro-backend/node_modules` ni les images locales versionnées attendues par `identity-stack.ps1`. Le démarrage aurait donc échoué avant les migrations. Aucun ancien stack n’a été réutilisé comme preuve. API réelle, PostgreSQL synthétique, parcours portail et matrice 12/12 restent NOT_VERIFIED.
- Le runner de caractérisation Node passe 5/5. Les suites Jest ciblées n’ont pas été exécutées : l’exécutable Jest est absent du worktree; elles ne sont pas déclarées PASS.
- Aucun secret, document réel, URL signée ni donnée personnelle n’est inclus.

## Verdict limité

**ÉCRAN CLIENTS : NON ACCEPTÉ — FAIL SÉCURITÉ ET INTÉGRITÉ.**

Les listes et lectures sont correctement isolées entre organisations dans le code, mais les mutations et le cycle contact/invitation nécessitent le lot décrit dans `CLIENTS-CORRECTION-BATCH.md`, suivi de la recette intégrée.

PRODUCT_CODE_CHANGE: NO

PRODUCTION_MUTATION: NO

PUSH_PR_MERGE: NO

APPLICATION_DEPLOYMENT: NO

REAL_NOTIFICATION: NO

WEB_AI_ACTIVATION: NO
