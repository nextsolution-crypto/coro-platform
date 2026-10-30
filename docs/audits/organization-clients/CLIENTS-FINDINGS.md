# Constats — écran Clients

Audit du SHA `cefdf1e6db37ad79fd511156cca574d083ce7cb4`.

## CLIENT-001 — mutations administratives accessibles aux opérateurs

- Sévérité : critique.
- Statut : FAIL, démontré par lecture du contrôleur et test de caractérisation.
- Scénario : un `OPERATOR` authentifié de l’organisation appelle directement `PUT /clients/:id`, `PUT /clients/:id/logo` ou `DELETE /clients/:id` avec l’identifiant d’un client de son organisation.
- Résultat : contrairement à `POST /clients`, ces routes n’appellent pas `requireTenantAdmin`. Le service vérifie seulement l’appartenance à l’organisation.
- Conséquence : modification des coordonnées/contact, remplacement du logo ou désactivation d’un client sans autorité administrative explicite.
- Correction proposée : appliquer une autorité canonique commune `ADMIN/SUPER_ADMIN` à toutes les mutations et tester le refus avant tout appel de service.
- Acceptation : refus 403 d’un opérateur, aucune écriture, invitation, notification ou audit métier; accès ADMIN/SUPER_ADMIN préservé.

## CLIENT-002 — mass assignment sur la modification

- Sévérité : critique.
- Statut : FAIL.
- Preuve : `ClientsService.update(id, data: any, ...)` transmet directement `data` à Prisma après le seul contrôle d’appartenance.
- Conséquence : des champs non présentés par le formulaire, notamment l’état et les relations acceptées par Prisma, peuvent être imposés par un appel direct.
- Correction proposée : DTO fermé avec validation/whitelist et projection explicite des champs modifiables.
- Acceptation : les propriétés inconnues ou gouvernées sont rejetées sans écriture.

## CLIENT-003 — création et provisionnement non atomiques

- Sévérité : élevée.
- Statut : FAIL.
- Scénario : création avec contact principal puis échec de création du compte ou de l’adaptateur d’invitation.
- Résultat : la fiche Client est créée avant `createCorpoAccess`; aucune transaction/outbox ne couvre l’ensemble.
- Conséquence : réponse d’échec après création partielle, puis doublon possible lors d’une nouvelle tentative.
- Correction proposée : transaction pour les données canoniques, invitation via outbox idempotente, clé de requête et résultat de reprise explicite.
- Acceptation : une panne ne produit ni faux échec ni doublon; la reprise retrouve l’opération initiale.

## CLIENT-004 — collision d’adresse silencieuse

- Sévérité : élevée.
- Statut : FAIL.
- Résultat : si un `ClientUser` existe déjà avec l’adresse, `createCorpoAccess` le retourne sans vérifier son organisation, son client, son rôle ou son état.
- Conséquence : la fiche peut être créée sans l’accès annoncé; aucune erreur actionnable n’explique la collision.
- Correction proposée : décision explicite selon l’identité existante, sans réaffectation implicite, avec réponse métier et audit.

## CLIENT-005 — changement de contact non atomique et sessions non révoquées

- Sévérité : élevée.
- Statut : FAIL/PARTIAL.
- Résultat : l’ancien `ClientUser` est désactivé, mais aucune révocation de session/lien n’est effectuée dans ce service; la création et l’invitation du nouveau contact suivent hors transaction.
- Conséquence : état partiel et délai potentiel avant refus d’une session existante, selon le guard client.
- Correction proposée : autorité de révocation canonique, transaction/outbox et preuve de refus de la session antérieure.

## CLIENT-006 — erreurs de chargement transformées en états trompeurs

- Sévérité : élevée.
- Statut : FAIL.
- Résultat : la liste journalise l’erreur puis affiche l’état vide; la fiche journalise l’erreur puis affiche « Client introuvable ».
- Conséquence : un 401/403/503 est présenté comme absence de données, sans nouvelle tentative.
- Correction proposée : états distincts, neutralisation des réponses obsolètes et bouton de reprise.

## CLIENT-007 — suppression présentée comme définitive

- Sévérité : moyenne.
- Statut : FAIL UX.
- Résultat : l’interface annonce « Supprimer » alors que le serveur effectue une désactivation `isActive=false`; elle n’explique pas les conséquences pour les accès portail.
- Décision métier : préciser les conséquences attendues de la désactivation du Client sur ses `ClientUser`, bâtiments, projets et données historiques.

## CLIENT-008 — accessibilité de la modale

- Sévérité : moyenne.
- Statut : FAIL statique; lecteur d’écran réel NOT_VERIFIED.
- Résultat : absence de `role=dialog`, `aria-modal`, libellé accessible du conteneur, capture/restitution du focus et fermeture clavier démontrée.

## CLIENT-009 — capacités de liste absentes

- Sévérité : faible.
- Statut : NON_APPLICABLE au fonctionnement promis, recommandation UX.
- Résultat : pas de recherche, filtre, tri explicite ni pagination sur cet écran. Aucune promesse actuelle n’a été trouvée.

## Non-régression #94/#95

`POST /clients` impose toujours `ADMIN/SUPER_ADMIN` et remplace tout `organizationId` fourni par celui du JWT. Le test historique prouve le refus avant appel au service. La PR #95 concernait uniquement le finaliseur QA d’identité et reste présente; elle ne couvre pas les autres mutations Clients.
