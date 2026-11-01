# Audit intégré du Manuel d’utilisation CORO

## Références et périmètre

- Branche locale isolée : `audit/organization-manual`.
- Candidat audité : `a5f40541a336df50e133b47ac00a69c355ca7f90` (`origin/main` au démarrage de l’audit).
- Version produit observée en production : `204ad4cc73f8df363473b88373c3461079254c1b`.
- Catalogue du Manuel : `2026-10-24.1`.
- Surface Organisation : `/manual`, 15 articles accessibles à un `User` interne actif.
- Surface Portail client : `/manual`, 14 articles accessibles à un `ClientUser` actif.
- PostgreSQL de production : tête 164 `20261117010000_building_governance`, d’après l’inspection gouvernée de la livraison Bibliothèque.

Le présent lot est un audit. Aucun code produit, contenu éditorial, droit, secret, donnée métier ou environnement de production n’a été modifié.

## Verdict limité au Manuel

`PARTIAL — CORRECTION_BATCH_REQUIRED`

Le Manuel est une aide versionnée, authentifiée, stable et lisible. Ses destinations existent, sa recherche locale tolère les accents et la casse, son aide extractive s’abstient lorsque le corpus ne permet pas de répondre et la matrice responsive ne présente aucun débordement horizontal. Il n’est toutefois pas acceptable comme manuel exhaustif de l’application Organisation actuelle : son contenu précède plusieurs livraisons consolidées, cinq espaces principaux visibles dans la navigation ne disposent d’aucun article et plusieurs décisions d’exploitation importantes sont absentes.

## Architecture observée

- Autorité éditoriale : `coro-backend/src/user-manual/user-manual.catalog.ts`.
- API interne : `GET /api/user-manual`, `GET /api/user-manual/:id`, `POST /api/user-manual/ask`.
- API client : mêmes contrats sous `/api/client-portal/user-manual`, protégés par `ClientJwtGuard`.
- Recherche guidée : moteur déterministe `USER_MANUAL_EXTRACTIVE`; aucun fournisseur IA ni document client n’est consulté.
- Frontends : deux pages distinctes mais quasi identiques dans `coro-frontend/app/manual` et `coro-client-portal/app/manual`.
- Liens : chaque article fournit une destination applicative et une ancre locale `/manual#<id>`.
- Images et téléchargements propres au Manuel : aucun.

## Exactitude fonctionnelle

Les éléments présents sont globalement prudents : Timelog est présenté comme un suivi du temps, les documents déposés ne sont pas assimilés à des documents approuvés, l’OCR est explicitement limité et Sentinelle Population n’est pas présenté comme un canal LIVE automatiquement validé.

Les écarts principaux sont des omissions :

- aucune instruction Clients ni explication de la désactivation et de la révocation immédiate des accès;
- aucune instruction Carte ni distinction entre tuiles publiques et géocodage public désactivé;
- aucune instruction Conformité expliquant qu’il s’agit d’un suivi documentaire factuel et non d’une attestation réglementaire;
- aucune instruction Bibliothèque précisant le catalogue global en lecture seule et son absence de raccordement à Knowledge/CORO AI;
- aucune instruction Paramètres;
- couverture seulement introductive du tableau de bord et des parcours documentaires consolidés;
- aucune règle explicite sur les projets archivés en lecture seule.

L’article sur la base documentaire bâtiment décrit bien un chemin distinct du simple stockage : un document doit être approuvé et son format admissible avant ingestion. Cette distinction doit cependant être rendue plus explicite, notamment face à la Bibliothèque qui n’est pas une source Knowledge.

## Navigation, recherche et états d’erreur

- Les 23 destinations du catalogue sont vérifiées par le test de source et de route; aucune route inventée n’a été constatée.
- Recherche locale : accents et casse normalisés (`bâtiment` et `BATIMENT` donnent chacun 5 résultats), recherche partielle fonctionnelle (`tim` donne 6 résultats), résultats multiples et état vide explicite.
- Aide extractive : la question Timelog retourne l’article attendu; les questions absentes ou injectées entraînent `INSUFFICIENT_EVIDENCE`.
- Les erreurs de chargement et d’aide sont visibles avec `role=alert`; le contenu déjà chargé reste consultable si seule l’aide échoue.
- Lien profond initial : fonctionnel lorsque les articles sont déjà rendus.
- F5 sur une ancre : défectueux. Sur `/manual#timelog`, la carte passe d’environ 205 px du haut avant F5 à environ 1731 px après le rechargement; React ne réapplique pas l’ancre après le chargement asynchrone.

## Permissions et confidentialité

- Accès anonyme : refus 401 sur listes, lectures directes et aide des deux surfaces.
- Un jeton client ne peut pas ouvrir l’API interne et réciproquement.
- Session client révoquée et `User` interne inactif : refus 401.
- Les articles internes ne sont pas exposés au portail; l’accès direct retourne 404.
- Les `sourceRefs` internes ne quittent pas le service; seules une version et une empreinte d’intégrité d’article sont exposées.
- Le contenu est commun à tous les utilisateurs d’une même audience. Il n’existe pas de filtrage par rôle, module ou affectation. Cela ne donne aucun droit applicatif, mais la politique de visibilité globale des instructions internes doit être explicitée.
- Aucun renseignement client, URL signée, jeton, secret ou contenu métier n’a été trouvé dans le catalogue.

## Chrome et accessibilité

Matrice exécutée sur la page de production authentifiée : 390×844, 768×1024, 1440×900 et 2560×1440, en Classic, Glass Light et Glass Dark.

- 12/12 : aucun débordement horizontal (`scrollWidth - clientWidth = 0`).
- 12/12 : 15 cartes rendues, champs et filtres utilisables.
- Mobile : grille ramenée à une colonne et formulaire empilé.
- Bureau : grille à deux colonnes, largeur du contenu plafonnée.
- Console : aucune erreur ou alerte critique capturée pendant la recette.
- Clavier/focus : contrôles natifs, libellés visibles et styles `:focus-visible` présents; aucune perte de contrôle observée.
- Arbre accessible : titres, régions, état, alerte, recherche, filtres et cartes exposés.
- Lecteur d’écran réel : `NOT_VERIFIED`; l’arbre DOM/AX ne constitue pas une preuve de restitution vocale.

Les préférences visuelles initiales Glass Dark ont été restaurées après la matrice.

## Production observée

La route authentifiée `https://app.getcoro.io/manual` a été observée strictement en lecture seule. Elle charge 15 articles internes et le catalogue `2026-10-24.1`. Les recherches effectuées ne contenaient aucune donnée métier ou personnelle. Aucun lien d’action métier n’a été activé.

## Validation technique

- `user-manual.service.spec.ts` : PASS.
- `user-manual.http.spec.ts` : PASS.
- Total ciblé : 18/18 tests PASS.
- Génération Prisma verrouillée : PASS (`@prisma/client` 6.19.3).
- Build backend Nest du candidat : PASS après génération du client Prisma.
- Contrôle navigateur : 12/12 configurations sans débordement.
- `git diff --check` : à exécuter sur les livrables finaux.
- Audit de dépendances : installation verrouillée signalant 33 vulnérabilités transitives (3 faibles, 27 modérées, 3 élevées); ce constat global n’est pas attribué au Manuel et aucune mise à niveau n’est autorisée dans ce lot.

## Limites

- Les rôles métier multiples n’ont pas été rejoués dans une base QA complète; les gardes réelles sont couverts par les tests HTTP isolés et la production par une session interne autorisée.
- Le portail client partagé a été audité par code et tests de garde; sa matrice visuelle antérieure demeure une preuve distincte, non rejouée dans ce lot Organisation.
- Aucun lecteur d’écran réel.
- Aucun scénario de panne réseau injecté en production; les branches d’erreur sont inspectées et les tests serveur couvrent les refus.

## Décision

Le Manuel peut rester accessible comme aide partielle et prudente. Il ne doit pas être présenté comme une documentation exhaustive de la release actuelle avant traitement des constats MAN-001 à MAN-005 et nouvelle recette ciblée.

- `PRODUCT_CODE_CHANGE: NO`
- `PRODUCTION_MUTATION: NO`
- `PUSH_PR_MERGE: NO`
- `APPLICATION_DEPLOYMENT: NO`
- `REAL_NOTIFICATION: NO`
- `WEB_AI_ACTIVATION: NO`

## Réconciliation du lot correctif

Cet audit initial est remplacé, pour les constats MAN-001 à MAN-005, par `MANUAL-CORRECTION-AND-ACCEPTANCE.md`. MAN-006 demeure `NOT_VERIFIED` faute de lecteur d’écran réel. La correction n’accorde aucun droit supplémentaire et ne modifie pas la production.
