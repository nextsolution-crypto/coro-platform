# Audit Bâtiments — registre des constats

Date : 2026-10-30

Candidat audité : `8b47845fb21c19c8711c4688292b47d6dd2281bc` (`origin/main`)

Production observée en lecture seule : `08d4a0e01cb0c2197cde21106ecd76d0b5d55d66`, inspection 41099241216 `SUCCESS`.

## Constats bloquants

| ID | Sévérité | Statut | Constat démontré | Effet | Preuve |
|---|---|---|---|---|---|
| BLD-001 | CRITIQUE | REPRODUIT | `GET /buildings/:id/projects` transmet seulement l'identifiant à `findProjects`; la requête Prisma ne contient ni organisation, ni client, ni périmètre acteur. | Un identifiant connu suffit à lire les métadonnées de projets d'un autre tenant. | `buildings-security-audit.spec.ts`, test 1 PASS (reproduction). |
| BLD-002 | CRITIQUE | REPRODUIT | `createManagerAccess` recherche un `ClientUser` par courriel global et lui ajoute le bâtiment sans vérifier son organisation, son client, son statut ou son rôle. | Affectation inter-tenant et extension de périmètre possibles; le parcours peut aussi émettre une invitation réelle. | Test 2 PASS (reproduction). |
| BLD-003 | ÉLEVÉE | CONFIRMÉ CODE | Les routes internes POST/PATCH/DELETE Bâtiments vérifient l'authentification et l'organisation active, mais aucune permission fonctionnelle ni rôle de mutation. | Tout `User` interne authentifié de l'organisation peut tenter création, modification ou désactivation. | `buildings.controller.ts`. |
| BLD-004 | ÉLEVÉE | CONFIRMÉ CODE | POST/PATCH acceptent `any`; `clientId`, `isActive`, `photoBase64` et d'autres champs sont projetés sans DTO/allow-list. La relation du client à l'organisation n'est pas validée avant création. | Mass assignment, rattachement incohérent, réactivation directe et charge de stockage non bornée côté serveur. | `buildings.controller.ts`, `buildings.service.ts`. |
| BLD-005 | ÉLEVÉE | CONFIRMÉ CODE | Création/modification, affectations du responsable et invitation ne forment pas une transaction/outbox atomique. | Bâtiment créé ou modifié malgré échec d'affectation/notification; doublons et succès partiels possibles. | `BuildingsService.create/update/createManagerAccess`. |
| BLD-006 | ÉLEVÉE | CONFIRMÉ CODE | Le cycle Bâtiment ne produit pas d'audit métier explicite pour création, édition, désactivation et changement de responsable. | Provenance et investigation insuffisantes pour une ressource structurante. | Aucun appel audit dans `BuildingsService`. |

## Constats importants

| ID | Sévérité | Statut | Constat démontré | Effet | Preuve |
|---|---|---|---|---|---|
| BLD-007 | MOYENNE | REPRODUIT | Les fichiers projet approuvés d'un bâtiment sont listés via la relation `project`, mais `content()` exige `ProjectFile.buildingId = buildingId`. | Un document affiché peut être impossible à télécharger. | Test 3 PASS (reproduction). |
| BLD-008 | MOYENNE | CONFIRMÉ CODE | La liste interne exclut les bâtiments inactifs; la lecture directe les retourne et PATCH permet de changer `isActive`. | Politique liste/directe incohérente et contournement de la règle d'archive possible. | `findAll`, `findOne`, `update`. |
| BLD-009 | MOYENNE | CONFIRMÉ CODE | Les erreurs de chargement des listes interne et portail sont seulement journalisées; l'écran peut ressembler à un état vide. La fiche interne journalise également l'échec sans état d'erreur visible. | Faux état vide et reprise impossible pour l'utilisateur. | Pages `/buildings` et `/buildings/[id]`. |
| BLD-010 | MOYENNE | CONFIRMÉ CODE | La création et certaines modifications déclenchent un géocodage public Nominatim sans timeout, adaptateur QA ou consentement explicite. | Adresse transmise à un tiers et disponibilité du parcours couplée à un fournisseur externe. | `geocodeAddress`. |
| BLD-011 | À DÉCIDER | OUVERT | Le portail général donne à `CLIENT_CORPORATE` la portée organisationnelle, tandis que Building Documents restreint ce rôle au même `clientId`. | Politique contradictoire; élargir ou restreindre exige une décision métier et des tests. | `ClientPortalService.getBuildings` vs `BuildingDocumentsService.access`; le test actuel consacre la restriction documentaire. |
| BLD-012 | MOYENNE | CONFIRMÉ CODE | Tous les `User` internes actifs peuvent déposer un document bâtiment (`canUpload: true`) sans permission documentaire dédiée. | Le dépôt n'est pas séparé de la simple consultation interne. | Test existant « allows active internal advisers to deposit ». |

## Garanties confirmées

- Les listes internes portent `organizationId`; la liste portail limite un manager à son client et à ses `buildingIds`.
- `ClientJwtGuard` revérifie le `ClientUser`, le Client actif et la version de session à chaque requête.
- Le stockage de nouveaux ProjectFiles est privé et immuable, avec SHA-256 et limite serveur de 50 Mo.
- Les formats non reconnus sont refusés; l'indexabilité Knowledge est annoncée séparément.
- Les fichiers client sont forcés à la visibilité `shared`; les fichiers internes peuvent rester `internal`.
- Les tests ciblés existants passent : 30/30; le runner de reproduction passe : 3/3.

## Verdict

`FAIL_BLOCKING_SECURITY_AND_INTEGRITY`

L'écran Bâtiments ne peut pas être déclaré accepté tant que BLD-001 à BLD-006 ne sont pas corrigés et que la politique BLD-011 n'est pas décidée.
