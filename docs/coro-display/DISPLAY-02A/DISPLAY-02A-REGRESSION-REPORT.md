# DISPLAY-02A — Rapport de régression

## Exécutions

| Ensemble | Résultat |
|---|---|
| Tests spatiaux ciblés | 27 PASS / 0 FAIL |
| Building, Auth, Organization guard, Client JWT, Spatial | 50 PASS / 0 FAIL |
| PostgreSQL spatial isolé | 1 PASS / 0 FAIL |
| Suite backend complète | 2 649 PASS / 1 BLOCKED / 5 SKIPPED |
| Build NestJS | PASS |
| ESLint ciblé | PASS |
| Prisma validate | PASS |

## Incident de suite complète

La première exécution en sandbox a produit des `spawn EPERM` sur des tests historiques utilisant des sous-processus. Une relance hors sandbox a éliminé ces erreurs. Il reste un seul test historique bloqué : `knowledge/office-extractor.spec.ts` requiert l’exécutable externe `pdftoppm`, absent de l’hôte (`ENOENT`). Les autres 2 649 tests passent; ce blocage n’est pas causé par DISPLAY-02A.

## Contrat portail

`ClientUser.displayPermissions` est préparé dans le modèle avec une valeur vide, mais aucune route portail spatiale ni projection de session n'est ajoutée dans ce lot. Le futur service portail devra relire l'autorité canonique avant chaque opération.

## Modules inchangés

Building, Organization, Client et Incident ne sont pas redirigés vers les nouvelles tables. Aucun comportement spatial existant n’est remplacé.

## Non exécuté

Frontend/Chrome : NOT_RUN, aucune interface n’est créée. Production : NOT_RUN. Lecteur d’écran : hors périmètre backend.
