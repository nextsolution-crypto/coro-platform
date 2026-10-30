# Lot de correction proposé — Bâtiments

Ce document prépare le travail; aucune correction produit n'est incluse dans l'audit.

## Lot 1 — Autorité canonique et DTO (bloquant)

1. Introduire une politique unique `BuildingAccessPolicy` pour liste, lecture, projets, documents et mutations.
2. Faire porter `organizationId` et l'acteur à `findProjects`; refuser avant toute lecture.
3. Ajouter des permissions explicites séparées : `BUILDING_READ`, `BUILDING_CREATE`, `BUILDING_UPDATE`, `BUILDING_DEACTIVATE`, `BUILDING_DOCUMENT_UPLOAD`, `BUILDING_GRANT_MANAGE`.
4. Remplacer les corps `any` par DTO allow-listés; refuser `organizationId`, `isActive`, latitude/longitude et champs système fournis par le navigateur.
5. Vérifier que le Client cible est actif et appartient à l'organisation.
6. Harmoniser la règle des bâtiments inactifs entre liste et lecture; aucune réactivation par PATCH générique.

Critère : deux organisations, plusieurs clients, User habilité/non habilité, manager/corporate, identifiant connu; liste et lecture directe strictement équivalentes.

## Lot 2 — Provisionnement responsable atomique (bloquant)

1. Ne jamais rattacher une identité trouvée par courriel sans valider organisation, client, type, rôle et statut.
2. Séparer l'affectation d'un ClientUser existant du provisionnement d'une nouvelle identité.
3. Utiliser le mécanisme canonique d'invitation/outbox chiffrée; aucun mot de passe temporaire envoyé directement.
4. Transactionner bâtiment, affectation, audit et événement outbox; idempotence et verrou de concurrence.
5. Revalidation d'admissibilité par le worker avant envoi.

Critère : aucun effet secondaire ni communication sur refus/rollback; identité homonyme d'un autre tenant inchangée.

## Lot 3 — Documents et Knowledge

1. Autoriser le contenu d'un fichier hérité via la relation serveur `project.buildingId`, sans accepter un parent fourni comme autorité.
2. Décider la portée documentaire de `CLIENT_CORPORATE` et la rendre cohérente avec la politique portail.
3. Exiger une permission de dépôt pour les Users internes.
4. Rejouer version, approbation, révocation, expiration, supersession, réindexation, citation et retrait d'accès.

Critère : tout document listé et admissible est téléchargeable par l'acteur autorisé; aucun fichier, hash, URL ou citation n'est exposé lors d'un refus.

## Lot 4 — Intégrité, UX et fournisseur

1. Ajouter l'audit immuable des transitions Bâtiment.
2. Encadrer photo/taille/MIME côté serveur.
3. Isoler le géocodage derrière un adaptateur gouverné, avec timeout, mode QA et politique de données.
4. Afficher chargement, vide, refus, erreur et nouvelle tentative sur listes et fiche.
5. Refaire la campagne Chrome authentifiée complète et le lecteur d'écran si disponible.

## Non inclus

- Audit général Carte ou Conformité.
- Activation d'un fournisseur, envoi réel, mutation de production.
- Changement implicite de la politique corporate.

## Lot effectivement réalisé

1. Autorité canonique alignée pour liste, lecture et projets liés.
2. Mutations réservées à l'administration tenant existante.
3. DTO validés et champs système interdits explicitement malgré le pipe global permissif.
4. Affectation responsable transactionnelle, idempotente et réutilisant l'outbox Clients.
5. Audit métier transactionnel.
6. Lecture Corporate organisationnelle sans extension implicite des droits de dépôt/gestion.
7. Documents directs et hérités téléchargeables via le stockage privé canonique.
8. Guard d'upload exécuté avant multipart.
9. États d'erreur/reprise visibles sur les deux interfaces.
10. Runner QA permanent API + navigateur ajouté au harnais global.

Migration additive : `20261117010000_building_governance`; rollback documenté comme suppression de la FK/index/colonne facultative uniquement après absence d'événement Bâtiment dépendant.

## État livré

- Candidat testé : `01cf448ab1c2742430ef2258a0edf5ea738d523f`.
- Merge/release : `2e6c06ef2ca2a2606e779c0480f64e6cea3d6a0c`.
- PR #137 : fusionnée.
- Release 41134179928 : `SUCCESS` et réconciliée.
- Inspection post-release 41135782370 : `GO`.
- Migration 163→164 : appliquée, tête attendue confirmée.

Le rollback technique complet conserve les quatre images de la release saine précédente. Cette release antérieure ne contient toutefois pas les corrections de sécurité Bâtiments : si un rollback applicatif devient indispensable, les routes Bâtiments/Documents affectées doivent être suspendues au niveau d'accès jusqu'au rétablissement du backend corrigé. Aucun retour destructif de base n'est autorisé.
