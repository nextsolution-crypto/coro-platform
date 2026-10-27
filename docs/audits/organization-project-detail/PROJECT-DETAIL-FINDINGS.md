# Constats — fiche projet organisation

## PROJ-DETAIL-001 — Rattachement client/bâtiment inter-organisation par mise à jour générique

- Catégorie : autorisation / intégrité tenant
- Gravité : **BLOQUANTE**
- Statut : **FAIL démontré**
- Acteur : OPERATOR affecté au projet de l'organisation A
- Reproduction : `PUT /projects/:id` avec le `clientId` et le `buildingId` valides de l'organisation B.
- Attendu : refus sans modification; le serveur doit résoudre et vérifier l'organisation, le client et le bâtiment.
- Observé : HTTP 200; le projet A référence temporairement le client et le bâtiment B. La fixture a été restaurée par la même API et la restauration est prouvée.
- Cause : le corps est `any`, `clientId` et `buildingId` ne figurent pas dans les champs protégés, puis `updateMany` applique directement `...data` (`projects.service.ts:175-210`).
- Impact : corruption de relations inter-tenant et exposition possible de noms/adresses via une fiche pourtant autorisée.
- Correction : DTO allowlist; résolution serveur atomique du client et du bâtiment dans l'organisation du projet; contrainte de cohérence ou transaction; refuser tout champ non prévu.
- Recette : combinaisons même client, autre client même organisation, autre organisation, bâtiment/client incohérents; aucun audit métier ou effet secondaire sur refus.

## PROJ-DETAIL-002 — Score qualité lisible par un OPERATOR non affecté

- Catégorie : autorisation d'une ressource annexe
- Gravité : **ÉLEVÉE**
- Statut : **FAIL démontré**
- Reproduction : l'OPERATOR A non affecté reçoit HTTP 404 sur `GET /projects/:id`, puis HTTP 200 sur `GET /projects/:id/quality-score`.
- Cause : le contrôleur transmet seulement `organizationId`; le service filtre `{ id, organizationId }` au lieu de `projectAccessWhere(actor)` (`projects.controller.ts:75-81`, `projects.service.ts:470-481`).
- Impact : déduction de l'existence, du niveau de complétude et de critères documentaires d'un projet hors affectation.
- Correction : transmettre l'acteur canonique et appliquer la même portée que la fiche avant tout calcul ou accès aux données annexes.
- Recette : affecté/non affecté, ADMIN légitime, autre organisation, projet désactivé et archive.

## PROJ-DETAIL-003 — Projet désactivé absent de la liste mais lisible par URL directe

- Catégorie : cohérence d'autorisation / désactivation
- Gravité : **ÉLEVÉE**
- Statut : **FAIL démontré**
- Reproduction : projet synthétique `isActive=false`; absent de `GET /projects`, présent par `GET /projects/:id` (HTTP 200) pour ADMIN A.
- Cause : la liste impose `isActive:true`; `findOne` ne le fait pas (`projects.service.ts:39,68,84-100`).
- Impact : un identifiant connu contourne l'effet apparent de la désactivation et rend les données et sous-ressources immédiatement chargeables.
- Décision nécessaire : confirmer si la désactivation signifie invisibilité totale ou consultation administrative dédiée. Le comportement actuel n'est pas cohérent.
- Recette : règle approuvée appliquée à la liste, lecture directe et ressources annexes; aucune réactivation implicite.

## PROJ-DETAIL-004 — Actions et étapes coupées à 390 px

- Catégorie : responsive / accessibilité
- Gravité : **ÉLEVÉE**
- Statut : **FAIL 3/12**
- Reproduction : 390 × 844, Classic, Glass Light ou Glass Dark.
- Observé : la rangée d'en-tête `justify-between` place les actions au-delà du bord droit; la grille `grid-cols-3` compresse et coupe le contenu. Le document global ne déborde pas, car le contenu est visuellement tronqué.
- Preuve : captures `390-*.png`; bounding boxes hors viewport pour Journal, Activités, Modèle, Procédures, Mandat, Archiver/Supprimer.
- Cause : conteneur d'en-tête non empilé (`page.tsx:520,548`) et grille toujours sur trois colonnes (`page.tsx:1045`).
- Correction : empilement mobile, groupe d'actions reflow/menu accessible, grille 1 colonne puis 3 colonnes aux breakpoints; conserver toutes les commandes accessibles.
- Recette : 390/768/1440/2560 × 3 thèmes, navigation latérale ouverte/repliée, textes longs, focus et cibles tactiles.

## PROJ-DETAIL-005 — Une panne principale est présentée comme « Projet introuvable »

- Catégorie : résilience / vérité de l'interface
- Gravité : **ÉLEVÉE fonctionnelle**
- Statut : **FAIL démontré**
- Reproduction : interception 503 de `GET /projects/:id`.
- Observé : écran « Projet introuvable », sans alerte, détail ni bouton Réessayer.
- Cause : l'exception est seulement écrite en console; `project` reste nul et le rendu 404 générique est utilisé (`page.tsx:159-209,445-448`).
- Impact : confusion entre refus, absence, panne et session expirée; aucune reprise contrôlée.
- Correction : états explicites `notFound/forbidden/unavailable/sessionExpired`, alerte accessible et retry; ne pas réutiliser de données d'un projet précédent.
- Recette : 404, 403, 401, 503, réseau coupé, réponse lente et récupération.

## PROJ-DETAIL-006 — Écrasement silencieux lors de modifications concurrentes

- Catégorie : intégrité / concurrence
- Gravité : **MOYENNE**, élevée si une future édition générale est exposée
- Statut : **FAIL démontré par API**
- Reproduction : OPERATOR et ADMIN ouvrent le même état; A modifie le nom, B envoie ensuite son état obsolète; deux HTTP 200, valeur finale de B.
- Cause : `Project` n'a pas de `lockVersion`; l'update ne porte aucune précondition de version.
- Impact : perte silencieuse d'une modification et journal incomplet de la collision.
- Correction : si des éditions générales restent autorisées, contrôle optimiste (`updatedAt` ou `lockVersion`) et réponse 409; sinon réduire l'endpoint aux transitions explicitement autorisées.
- Recette : deux sessions, archive/retrait d'accès entre ouverture et sauvegarde, retry après 409.

## PROJ-DETAIL-007 — Hiérarchie et libellé de désactivation trompeurs

- Catégorie : UX / action destructive
- Gravité : **MOYENNE**
- Statut : **FAIL prouvé par le code et la capture**
- Observé : sept actions de même niveau dominent l'en-tête; la modal dit « Supprimer définitivement », alors que l'API met `isActive=false`.
- Impact : risque d'action involontaire et représentation erronée de la réversibilité/rétention.
- Correction : menu d'actions secondaires; libellé « Désactiver » cohérent; expliquer effet, conservation et visibilité.
- Recette : ouverture/annulation, confirmation exacte, F5 et liste après succès/échec.

## PROJ-DETAIL-008 — Dates et fraîcheur insuffisantes

- Catégorie : utilité / définition produit
- Gravité : **NON BLOQUANTE** pour consultation simple
- Statut : **DÉCISION_PRODUIT_REQUISE**
- Observé : seule l'année est affichée. `createdAt` et `updatedAt` existent mais ne sont pas rendus; aucune échéance de projet n'existe dans le modèle. La progression et la qualité n'affichent aucune fraîcheur.
- Impact : l'utilisateur ne peut distinguer création, dernière modification et échéance ni juger la fraîcheur des indicateurs.
- Décision : déterminer les dates utiles et l'autorité d'une échéance avant ajout.

## PROJ-DETAIL-009 — Échecs des zones secondaires silencieux

- Catégorie : résilience / observabilité utilisateur
- Gravité : **MOYENNE**
- Statut : **FAIL prouvé par le code; panne secondaire complète NOT_VERIFIED en navigateur**
- Observé : document/plans sont transformés en absence; observations/commentaires/versions sont absorbés par des `catch` vides (`page.tsx:159-204`).
- Impact : faux vide ou fonctionnalité disparue, impossible à distinguer d'une donnée réellement absente.
- Correction : état individuel par zone, message compact et retry sans rendre toute la fiche indisponible.
