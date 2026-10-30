# Correction et acceptation integree - Carte CORO

## Candidat

- Branche : `fix/organization-map-security`
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
| MAP-009 | DECISION_PENDING | La regle metier historique basee sur `updatedAt` n'a pas ete changee sans autorisation produit. Elle n'affecte ni l'acces ni la securite de la carte. |
| MAP-010 | PARTIAL | Chrome 24/24, controles nommes, F5 et zoom 200 % reussis. Lecteur d'ecran reel : `NOT_VERIFIED`. |

## Politique fournisseur appliquee

- Leaflet est charge localement dans les deux applications.
- Les cartes utilisent `https://tile.openstreetmap.org/{z}/{x}/{y}.png` et
  affichent l'attribution obligatoire.
- Les erreurs de tuiles sont annoncees; la liste autorisee des batiments reste
  utilisable sans carte.
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
- F5 : session synthetique conservee dans les deux applications.
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
- Regle de renouvellement basee sur `updatedAt` : decision metier distincte.
- Activation d'un fournisseur de geocodage public : decision de gouvernance
  distincte; le chemin est desactive par defaut.

## Verdict

`CORRECTION_IMPLEMENTED_QA_ACCEPTED_READY_FOR_PR_REVIEW`

Aucune fusion, aucun deploiement, aucune mutation de production, aucune
communication externe et aucun appel reel de geocodage n'ont ete effectues.
