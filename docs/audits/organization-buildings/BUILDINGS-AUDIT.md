# Audit intégré de l'écran Bâtiments

## Périmètre et méthode

Audit en lecture seule du produit sur la branche isolée `audit/organization-buildings`, issue de `origin/main` `8b47845fb21c19c8711c4688292b47d6dd2281bc`. Les changements du worktree sont exclusivement : instrumentation QA, preuves synthétiques et documentation.

La production n'a pas été sollicitée pour une mutation. L'état actif est référencé par l'inspection gouvernée existante 41099241216 : `SUCCESS`, SHA `08d4a0e01cb0c2197cde21106ecd76d0b5d55d66`.

Méthode :

1. inventaire des routes, services, modèles et écrans;
2. comparaison liste/lecture directe et parent/ressources annexes;
3. lecture des contrôles JWT, organisation, client, bâtiment, permissions et lifecycle;
4. tests existants ciblés;
5. tests de caractérisation dédiés reproduisant trois écarts;
6. build et Chrome local avec données synthétiques;
7. aucune donnée client réelle, aucun envoi, aucune activation fournisseur.

## Architecture observée

- Autorité Bâtiment interne : `BuildingsController` / `BuildingsService` / modèle Prisma `Building`.
- Autorité portail : `ClientJwtGuard`, `ClientPortalService.getBuildings/getProjects`.
- Autorité documentaire : `BuildingDocumentsService` puis `ProjectFilesService` et stockage privé immuable.
- Autorité Knowledge : ingestion seulement des versions admissibles; recherche/citations portées par organisation et bâtiment.
- Interfaces : application interne `/buildings`, `/buildings/[id]`; portail `/buildings`, `/buildings/[id]`.

Le modèle impose des clés uniques composites bâtiment/client/organisation, mais le service Bâtiments n'utilise pas systématiquement ces clés lors des validations.

## Résultat fonctionnel

Les listes, cartes responsive, séparation conformité/documentation et contrôles documentaires possèdent une base fonctionnelle réelle. Le portail limite correctement `CLIENT_MANAGER` à ses affectations dans les services canoniques. Le stockage documentaire est privé, versionné et intègre.

L'acceptation intégrée échoue toutefois pour six motifs bloquants : IDOR des projets, affectation inter-tenant par courriel, mutations sans permission fonctionnelle, mass assignment, absence d'atomicité/outbox et absence d'audit Bâtiment. Voir `BUILDINGS-FINDINGS.md`.

## Organisation ↔ Client

- Interne : `findAll/findOne` imposent l'organisation, mais `findProjects` ne l'impose pas.
- Portail manager : organisation + client + `buildingIds`.
- Portail corporate : organisation pour les listes/projets.
- Documents corporate : même client seulement, politique différente à arbitrer.
- Client désactivé : refusé par `ClientJwtGuard` à la requête suivante; aucune ancienne session ne contourne ce contrôle.

## Stockage, extraction et citations

- Upload canonique : objet privé immuable, SHA-256, référence non publique, 50 Mo maximum côté service ProjectFile.
- Les versions projet en travail ne sont pas publiées au bâtiment avant approbation.
- Révoqué, supersédé, expiré et supersession effective sont masqués de la vue courante.
- Knowledge distingue formats déposables et indexables; aucun support universel n'est revendiqué.
- Défaut : un fichier projet approuvé listé via son projet n'est pas résolu par la route de contenu qui exige un `buildingId` direct.

## QA et preuves

- 30 tests ciblés existants : PASS.
- 3 reproductions de sécurité/intégrité : PASS (les défauts sont donc démontrés).
- 26 tests design/navigation portail : PASS.
- build Next.js et TypeScript portail : PASS.
- Chrome synthétique : 10/10 PASS sur cartes, sans débordement, largeur max 445 px.
- Preuves sanitised : `evidence/building-layout/`; aucune adresse, identité ou donnée réelle.
- Matrice authentifiée complète multi-acteurs, mutations, fiche/document/Knowledge et 12 combinaisons de thèmes : non exécutée en raison des défauts bloquants. Le portail public livre Classic; Glass reste une capacité bêta distincte.

## Conclusion

**Verdict : `FAIL_BLOCKING_SECURITY_AND_INTEGRITY`.**

Le sous-parcours de consultation responsive peut être démontré avec données synthétiques, mais le périmètre Bâtiments ne doit pas être accepté ni étendu commercialement avant correction et nouvelle recette intégrée.

## Confirmations de gouvernance

- `PRODUCT_CODE_CHANGE: NO`
- `PRODUCTION_MUTATION: NO`
- `PUSH_PR_MERGE: NO`
- `APPLICATION_DEPLOYMENT: NO`
- `REAL_NOTIFICATION: NO`
- `WEB_AI_ACTIVATION: NO`
