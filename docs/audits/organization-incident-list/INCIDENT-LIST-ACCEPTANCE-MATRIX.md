# Matrice d’acceptation — liste des incidents

## Périmètre et autorité

La route d’écran réelle est `/sentinelle/[buildingId]/incidents` dans le portail Client. Elle appelle `GET /api/client-portal/incidents/buildings/:buildingId/history`; la destination de ligne appelle `GET /api/client-portal/incidents/:incidentId/detail`.

| Acteur | Écran Client | Liste | Lecture directe | Résultat |
|---|---:|---:|---:|---|
| CLIENT_MANAGER avec bâtiment + `INCIDENT_READ` | oui | autorisée | autorisée | PASS QA |
| CLIENT_MANAGER sans bâtiment | oui | refus 403 | refus attendu | PASS QA |
| CLIENT_CORPORATE de l’organisation | oui | autorisée | autorisée | PASS QA |
| ClientUser d’une autre organisation | oui | 404 | 404 | PASS QA |
| ClientUser désactivé/session révoquée | oui | 401 | 401 | PARTIAL — garde/session couverte; navigateur authentifié non exécuté |
| Anonyme | non | 401 | 401 | PASS QA |
| SUPER_ADMIN / ADMIN / OPERATOR | non | endpoint interne distinct | endpoint interne distinct | NON_APPLICABLE à cet écran |

L’autorité Client démontrée est la combinaison : identité active et Client actif, `IncidentPermission.INCIDENT_READ`, organisation, puis portée bâtiment (`CLIENT_MANAGER`) ou portée organisationnelle canonique (`CLIENT_CORPORATE`).

## Fonctionnel

| Contrôle | Statut | Preuve / observation |
|---|---|---|
| Ouverture | PASS | backend/PostgreSQL réels, client corporate synthétique |
| Compteur | FAIL | 50 affiché pour 62 incidents |
| Recherche | NOT_APPLICABLE | fonction absente |
| Filtres Tous/Résolus/En cours | PARTIAL | filtre local fonctionnel; sémantique « En cours » incomplète |
| Réinitialisation filtre vide | PASS | test unitaire ciblé |
| Tri | NOT_APPLICABLE | fonction absente; ordre serveur décroissant seulement |
| Pagination | FAIL | plafond 50 sans mécanisme de suite |
| Accès détail autorisé | PASS | destination et autorité vérifiées; fiche non auditée |
| Création rapide | NOT_APPLICABLE | absente de la liste |
| Actions de ligne | NOT_APPLICABLE | seule navigation vers le détail |
| F5 | PASS | état par défaut rechargé depuis le serveur |
| Réponses désordonnées | PASS ciblé | garde `requestId`; test existant « late response » réussi |
| Panne 503 / reprise | NOT_VERIFIED navigateur | logique d’état et reprise PASS dans les tests ciblés; l’interception CDP n’a capturé aucune requête, donc aucune preuve navigateur n’est revendiquée |
| Faux zéro après erreur | PASS | états `error` et `stale` distincts; tests ciblés réussis |

## Résilience et accessibilité

| Contrôle | Statut |
|---|---|
| Chargement distinct du vide | PASS |
| Aucun incident | PASS |
| Aucun résultat après filtre | PASS |
| Accès refusé | PASS |
| Session expirée | PASS ciblé / navigateur à confirmer |
| Clavier et focus | PASS ciblé |
| Zoom 200 % | voir preuve navigateur |
| Lecteur d’écran réel | NOT_VERIFIED — non remplacé par le DOM |

## Chrome

| Thème \ Format | 390×844 | 768×1024 | 1440×900 | 2560×1440 |
|---|---:|---:|---:|---:|
| Classic | FAIL — cible tactile < 40 px | PASS | PASS | PASS |
| Glass Light | FAIL — cible tactile < 40 px | PASS | PASS | PASS |
| Glass Dark | FAIL — cible tactile < 40 px | PASS | PASS | PASS |

Captures et mesures : `D:\CORO-QA\tracking\organization-incident-list\browser` et `incident-list-browser-acceptance.json`. La géométrie mesurée est donc **9/12 PASS**. Les trois échecs reproduisent au moins une cible interactive du shell/de la liste sous 40 px à 390 px; aucun débordement horizontal critique n’a été observé.

## Production

**NOT_VERIFIED.** Aucun onglet CORO authentifié légitime n’était disponible pendant l’audit. L’intervention minimale restante est l’ouverture d’un onglet authentifié directement sur la liste des incidents; aucune donnée opérationnelle ne doit être exportée dans les preuves.
