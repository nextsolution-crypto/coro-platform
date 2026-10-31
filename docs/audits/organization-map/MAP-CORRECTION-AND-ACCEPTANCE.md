# Correction et acceptation integree - Carte CORO

## Candidat

- Branche : `fix/organization-map-security`
- HEAD initial de reprise : `45abb0ac45733e31c4d33435bad0ed153f8d52b1`.
- Candidat produit et QA integree teste : `ede05dc355eaa2bf28089b7a918a7910898ec348`.
- Base d'audit : `05150c283b4453587e75f342cda65507a2e59ad2`
- Portee : carte Organisation et carte Portail client.
- Donnees : organisations, clients, batiments et noms XSS synthetiques uniquement.

Ce rapport reconcilie et remplace les statuts initiaux de `MAP-FINDINGS.md` pour
le candidat corrige. Il ne remplace pas l'historique de l'audit.

## Constats reconcilies

| ID | Statut final | Preuve de cloture |
| --- | --- | --- |
| MAP-001 | RESOLVED | Infobulles construites avec des noeuds DOM et `textContent`; tests XSS unitaires et navigateur. |
| MAP-002 | RESOLVED | Les deux cartes utilisent le paquet Leaflet local; aucun appel UNPKG dans la matrice 24/24. |
| MAP-003 | RESOLVED | Erreur API distincte de l'etat vide, message explicite et action de reprise. |
| MAP-004 | RESOLVED | Attribution OpenStreetMap visible sur les deux cartes et URL officielle exacte. |
| MAP-005 | RESOLVED | Validateur fini et borne acceptant les coordonnees zero, couvert par tests. |
| MAP-006 | RESOLVED | La liste structuree et actionnable conserve l'acces a chaque batiment superpose; jeu navigateur avec deux marqueurs coincidents. |
| MAP-007 | RESOLVED | La selection est reconciliee a chaque changement de filtre client. |
| MAP-008 | RESOLVED_WITH_GOVERNANCE | Geocodage public desactive par defaut; activation explicite, cache 24 h, deduplication, limitation globale a 1 requete/s, timeout et echec ferme. Decision fournisseur/confidentialite toujours requise avant activation. |
| MAP-009 | RESOLVED_WITH_CLARIFICATION | Le calcul reste une heuristique factuelle (`updatedAt` d'un document valide vieux de plus d'un an), mais le libelle trompeur « A renouveler » devient « Mise a jour a verifier ». Il ne constitue pas une echeance reglementaire. |
| MAP-010 | PARTIAL | Chrome 24/24, controles nommes, F5 et zoom 200 % reussis. Lecteur d'ecran reel : `NOT_VERIFIED`. |

## Politique fournisseur appliquee

- Leaflet est charge localement dans les deux applications.
- Les cartes utilisent `https://tile.openstreetmap.org/{z}/{x}/{y}.png` et
  affichent l'attribution obligatoire.
- Les erreurs de tuiles sont annoncees; la liste autorisee des batiments reste
  utilisable sans carte.
- Un chargement public limite avec coordonnees synthetiques a obtenu des
  reponses OSM `200`, affiche l'attribution et n'a emis aucun appel UNPKG.
- La panne deterministe de 24 tuiles apres un chargement reel affiche le message
  de repli dans un element `role="alert"`, conserve la liste actionnable, puis
  disparait apres rechargement et reprise de 24 tuiles valides. L'erreur console
  d'image volontairement corrompue est attendue et isolee a cette phase.
- Le geocodage Nominatim public exige
  `BUILDING_PUBLIC_GEOCODING_ENABLED=true`. Il est desactive par defaut, utilise
  un cache memoire de 24 heures, deduplique les appels concurrents, limite les
  departs a un par seconde et echoue sans coordonnee fabriquee.
- Aucune adresse reelle et aucun appel Nominatim n'ont ete utilises dans cette
  recette. L'activation commerciale exige une decision explicite concernant le
  fournisseur, la confidentialite, le SLA et le cache durable.

References officielles :

- <https://operations.osmfoundation.org/policies/tiles/>
- <https://operations.osmfoundation.org/policies/nominatim/>

## Acceptation technique

- Audit automatise : 18 controles conformes, 0 constat automatise ouvert.
- Backend : 4 suites ciblees, 87 tests reussis.
- Contrats carte : 11 tests reussis.
- TypeScript : Organisation et Portail `PASS`.
- Builds de production : Organisation et Portail `PASS`.
- Chrome : 24/24 (`2 applications x 4 dimensions x 3 themes`).
- Recette integree complementaire : 5/5 configurations representatives sur
  PostgreSQL 16, backend reel et les deux applications reelles.
- Portees reelles : administrateur, operateur, `CLIENT_CORPORATE`,
  `CLIENT_MANAGER`, autre tenant, identite inactive et Client desactive `PASS`.
- Selection : compteurs, marqueurs, liste et ouverture du bon batiment
  coherents dans les cinq scenarios.
- F5 : session synthetique conservee dans les deux applications.
- Retrait d'affectation : le prochain F5 passe de un marqueur a zero. Le garde
  client relit maintenant les affectations et permissions canoniques a chaque
  requete au lieu d'utiliser la portee figee dans le JWT.
- Zoom 200 % : aucun debordement horizontal de page.
- Console : aucune erreur critique dans la matrice finale.
- XSS : balisage et attribut evenementiel affiches comme texte, jamais executes.
- Coordonnees : zero accepte, hors bornes ignore, marqueurs coincidents accessibles
  par la liste alternative.

Dimensions testees : 390 x 844, 768 x 1024, 1440 x 900 et 2560 x 1440.
Themes testes : Classic, Glass Light et Glass Dark.

Les captures et mesures sont conservees hors depot dans
`D:\CORO-QA\tracking\organization-map\browser`. Le rapport machine est
`organization-map-browser.json`.

Les preuves integrees sont conservees dans
`D:\CORO-QA\tracking\organization-map\integrated` et les preuves fournisseur
dans `D:\CORO-QA\tracking\organization-map\provider-network`.

## Defauts reveles pendant l'acceptation finale

- Le portail pouvait afficher la liste sans initialiser Leaflet lorsque son
  utilisateur authentifie devenait disponible apres les donnees. Le montage du
  conteneur est maintenant un signal explicite; la regression est couverte.
- Une session `CLIENT_MANAGER` conservait une ancienne liste `buildingIds`.
  `ClientJwtGuard` conserve le JWT comme preuve d'identite et relit la portee
  mutable canonique en base a chaque requete. Le retrait est effectif sans
  deconnexion et sans affaiblissement inter-tenant.

## Autorisation

Les contrats serveur existants restent canoniques :

- acteur interne : organisation et affectations applicables;
- `CLIENT_MANAGER` : client et batiments affectes;
- `CLIENT_CORPORATE` : portee organisationnelle autorisee;
- aucune portee interorganisation;
- un identifiant connu n'accorde aucun acces.

Ce lot ne cree aucun endpoint de mutation et ne remplace pas les gardes serveur.

## Limites restantes

- Lecteur d'ecran reel : `NOT_VERIFIED` faute d'outil fiable dans ce runtime.
- Exactitude physique d'adresses reelles : `NOT_VERIFIED`; aucune adresse reelle
  n'etait necessaire ou autorisee.
- L'heuristique de fraicheur ne remplace aucune regle reglementaire; une future
  echeance metier exigerait une decision et une source de donnees distinctes.
- Activation d'un fournisseur de geocodage public : decision de gouvernance
  distincte; le chemin est desactive par defaut.
- Disponibilite et SLA OSM : non garantis par ce chargement ponctuel.
- Lecteur d'ecran reel : `NOT_VERIFIED`; le role et le message accessibles sont
  prouves dans le DOM, sans revendiquer de restitution vocale.

## Verdict

`ACCEPTATION_INTÉGRÉE_PASS`

Aucune fusion, aucun deploiement, aucune mutation de production, aucune
communication externe et aucun appel reel de geocodage n'ont ete effectues.
