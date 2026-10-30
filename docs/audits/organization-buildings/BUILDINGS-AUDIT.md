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

## Acceptation corrective intégrée

- API réelle QA : 17/17 contrôles PASS, incluant IDOR, DTO hostile, idempotence concurrente, portée Corporate/Manager, révocation et téléchargement privé exact.
- PostgreSQL 16 : chaîne 164 depuis zéro PASS; upgrade 163→164 avec bâtiment et événement historiques conservés PASS.
- Interfaces : builds production PASS; Design System PASS.
- Chrome authentifié : 24/24 configurations PASS (12 organisation + 12 portail), F5 et zoom 200 % PASS, aucune erreur console critique.
- Cartes portail : largeur mesurée entre 356,8125 et 445 px selon viewport; maximum 445 px préservé.
- Stockage : objet QA privé, téléchargement authentifié octet pour octet; autre tenant HTTP 404.

Verdict du candidat correctif : `ACCEPTATION_INTÉGRÉE_PASS`.

Limites : lecteur d'écran réel `NOT_VERIFIED`; les capacités documentaires nouvelles au-delà des formats et de l'indexation existants restent des écarts produit, pas des promesses de ce lot.

## Livraison gouvernée et inspection finale

La PR #137 a été fusionnée et livrée sous le SHA immuable `2e6c06ef2ca2a2606e779c0480f64e6cea3d6a0c`. Le workflow de release 41134179928 est terminal `SUCCESS`, y compris construction des quatre images, release fail-closed, réconciliation et rotation de rétention.

L'inspection post-release 41135782370 conclut `GO` : quatre services applicatifs actifs, aucun redémarrage, PostgreSQL 16.15 sain, 164 migrations et tête `20261117010000_building_governance`. La sauvegarde `production-20261030T220150Z-ed8d04f8afae` est `REMOTE_VERIFIED`; le restore drill `20261030T220219Z-caa5b8422bd7` est `RESTORE_VERIFIED`.

Le contrôle de capacité 41135785608 est `SUCCESS` avec 36 529 483 776 octets libres, 16 823 746 510 octets de marge de release et les quatre images de rollback disponibles. Aucun nettoyage supplémentaire n'a été nécessaire après réconciliation.

Verdict final du périmètre : `VALIDATED_INTEGRATED_MERGED_DEPLOYED_RECONCILED`.
