# Audit ciblé — écran Carte CORO

Date : 2026-10-30  
Branche : `audit/organization-map`  
Base documentaire : `af73ee3cd1c33ffb00140d5bf06cc939328e6209`  
Version de production observée : `2e6c06ef2ca2a2606e779c0480f64e6cea3d6a0c`  
PostgreSQL de production observé : 16.15, 164 migrations, tête `20261117010000_building_governance`

## Verdict

**CORRECTION_REQUIRED_BEFORE_MAP_ACCEPTANCE**

Le contrôle d'accès serveur des bâtiments demeure canonique et aucun accès interorganisation n'a été reproduit. L'écran Carte ne peut toutefois pas être accepté dans son état actuel : les infobulles Leaflet reçoivent du HTML construit avec des données métier non échappées, la carte Organisation charge Leaflet depuis un CDN public sans contrôle d'intégrité ni repli, les erreurs ne sont pas présentées à l'utilisateur, et les deux cartes désactivent l'attribution du fournisseur de tuiles.

Le mandat était un audit. Aucun code produit, aucune donnée de production et aucune configuration fournisseur n'ont été modifiés.

## Périmètre examiné

- Organisation : `/buildings/map`, `GET /buildings`.
- Portail client : `/map`, `GET /client-portal/buildings`.
- Création et modification de bâtiments utilisant le géocodage Nominatim.
- Leaflet, OpenStreetMap, états d'erreur, coordonnées, filtrage, accessibilité et conséquences sur le portail partagé.
- Politique d'accès : organisation, client, affectations bâtiment, acteur interne et acteur client.

## Autorisation et isolation

### Organisation

`BuildingsService.findAll` contraint les résultats à l'organisation de l'acteur, aux bâtiments actifs et, pour un opérateur, aux projets auxquels il est affecté. Le filtre client est appliqué côté serveur. Un identifiant de bâtiment connu ne constitue pas une autorisation.

### Portail client

Le portail réutilise l'autorité d'accès canonique validée par le lot Bâtiments :

- `CLIENT_MANAGER` : client et bâtiments affectés;
- `CLIENT_CORPORATE` : portée organisationnelle explicitement autorisée;
- client désactivé : refus au garde serveur;
- aucune portée interorganisation.

**Statut : PASS côté contrat serveur.** La réussite ne neutralise pas les défauts de rendu et de fournisseur décrits ci-dessous.

## Exactitude géographique

- Les deux écrans considèrent `0` comme une coordonnée absente à cause d'un test de vérité (`latitude && longitude`).
- Aucune validation locale finie et bornée (`-90..90`, `-180..180`) n'est appliquée avant Leaflet.
- Aucun regroupement n'est prévu pour plusieurs bâtiments aux mêmes coordonnées; les marqueurs se recouvrent.
- La carte Organisation peut conserver une sélection qui ne correspond plus au filtre client actif.
- Le statut « À renouveler » de la carte Organisation est inféré depuis `updatedAt` plutôt que depuis une autorité documentaire ou contractuelle explicite. Cette règle exige une validation métier.

## Résilience et erreurs

- Organisation : une erreur API est seulement écrite dans la console. L'état vide et l'échec sont visuellement indiscernables; aucun bouton de reprise n'est offert.
- Portail : l'erreur API est visible et une reprise est proposée.
- Les pannes de tuiles ou de script fournisseur ne disposent pas d'une alternative fonctionnelle explicite.
- Les cartes textuelles constituent une alternative partielle, mais l'écran doit annoncer clairement l'indisponibilité cartographique.

## Sécurité du rendu

Les deux écrans construisent une chaîne HTML pour `bindTooltip` avec le nom du bâtiment et, côté Organisation, le nom du client. Leaflet interprète cette chaîne comme du HTML. Une donnée métier contenant du balisage peut donc devenir du contenu actif dans le navigateur d'un acteur autorisé.

La correction attendue est de construire des nœuds texte, ou d'échapper strictement toutes les données avant tout passage à une API HTML. Un test de non-régression doit couvrir les noms contenant `<`, `>`, guillemets et attributs événementiels.

## Accessibilité et responsive

- Les boutons plein écran et fermeture ne possèdent pas tous un nom accessible explicite.
- La zone cartographique n'a pas de description structurée équivalente.
- L'usage clavier et lecteur d'écran réel reste `NOT_VERIFIED`.
- La matrice Chrome 12 configurations reste `NOT_VERIFIED`; aucune preuve navigateur complète et traçable n'a été produite par cet audit local.
- Les cartes textuelles réduisent le risque d'impasse, mais ne remplacent pas les contrôles clavier, focus, zoom 200 % et débordement.

## Méthode et preuves

- Caractérisation statique reproductible : `qa/global-e2e/src/organization-map-audit.mjs`.
- Tests du contrat de l'outil : `qa/global-e2e/test/organization-map-audit.test.mjs`.
- Test fournisseur existant du portail : `coro-client-portal/app/map/map-provider.contract.test.mjs`.
- Preuve locale générée hors dépôt : `D:\CORO-QA\tracking\organization-map\organization-map-audit.json`.

Résultat de caractérisation : **5 contrôles conformes, 9 constats**. Ces contrôles décrivent l'état courant; ils ne constituent pas une correction produit.

## Limites

- Aucun test sur données réelles et aucun accès à des données étrangères.
- Aucun appel fournisseur réel requis pour conclure aux écarts de contrat.
- Lecteur d'écran réel : `NOT_VERIFIED`.
- Matrice Chrome 12/12 : `NOT_VERIFIED`.
- Exactitude physique d'adresses réelles : `NOT_VERIFIED`; seules les règles de validation et le contrat fournisseur ont été audités.
