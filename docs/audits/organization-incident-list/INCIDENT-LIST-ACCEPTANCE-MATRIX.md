# Matrice d’acceptation — liste des incidents

## Autorité

| Acteur / contrôle | Résultat |
|---|---|
| CLIENT_MANAGER affecté + `INCIDENT_READ` | PASS liste et détail |
| CLIENT_MANAGER sans bâtiment | PASS — 403 sans contenu |
| CLIENT_CORPORATE de l’organisation | PASS |
| ClientUser autre organisation | PASS — 404 |
| Anonyme | PASS — 401 |
| Paramètres hors bornes | PASS — 400 |

L’autorité demeure : identité et Client actifs, permission Incident, organisation, puis portée bâtiment pour le manager ou portée organisationnelle canonique pour le corporate.

## Fonctionnel et résilience

| Contrôle | Statut |
|---|---|
| 137 incidents sur plus de cinq pages | PASS — 137 uniques |
| Ordre stable avec dates égales | PASS |
| Compteurs sur périmètre complet | PASS |
| Recherche, filtres avant pagination et tri combiné | PASS |
| Réinitialisation de page | PASS |
| Contrat minimal / champs sensibles absents | PASS |
| Statuts réels et statut inconnu | PASS |
| Exercice / incident réel | PASS |
| Détail autorisé / inter-tenant refusé | PASS |
| Chargement, vide, filtre vide, erreur, refus | PASS |
| 503, filtres conservés et reprise | PASS Chrome |
| Réponses désordonnées | PASS Chrome |
| F5, clavier, focus et zoom 200 % | PASS |
| Consommateur Population : sous-ensemble récent + total + lien complet | PASS |
| Consommateur Organisation | NOT_APPLICABLE — aucun appel à ce endpoint dans le dépôt |
| Lecteur d’écran réel | NOT_VERIFIED |

## Dépendance d'autorisation livrée

Le mécanisme d'administration Incident de la PR `#175` est déployé au SHA `d9eb6d84668a5773257ec75b7a06c062b7786384` (release `41638570059`, inspection `41640868682`). Il permet l'administration gouvernée de la permission individuelle et de l'affectation active, sans créer de droit implicite. La liste autorisée en production reste `NOT_VERIFIED` tant qu'une attribution nominative minimale n'a pas été approuvée puis appliquée. Le refus historique ne doit plus être qualifié de blocage produit, mais d'absence volontaire d'attribution.

## Chrome 12/12

| Thème \ Format | 390×844 | 768×1024 | 1440×900 | 2560×1440 |
|---|---:|---:|---:|---:|
| Classic | PASS | PASS | PASS | PASS |
| Glass Light | PASS | PASS | PASS | PASS |
| Glass Dark | PASS | PASS | PASS | PASS |

Captures inspectées dans `D:\CORO-QA\tracking\organization-incident-list\browser`. Aucun débordement horizontal, aucune cible sous 44 px et aucune erreur console critique.

## Production

| Contrôle | Statut |
|---|---|
| PR #170 / SHA fusionné | PASS — `082f396bf3d6e9ae85c5d47e980d09bac0df13fc` |
| CI, gates et release gouvernée | PASS — `41551760955`, `41552412893`, `41552417723`, `41552585795` |
| Inspection et réconciliation | PASS — `41554507500`, `41554515301`, `41554684601` |
| Services, PostgreSQL, sauvegarde/restauration, rollback | PASS |
| Navigateur authentifié lecture seule | PARTIAL — route ouverte, refus 403 explicite, F5 et reprise PASS; identité sans `INCIDENT_READ`, données/filtres/pagination non observables |
| Console production | PARTIAL — 403 attendus et rejets du service worker sur schéma `chrome-extension`; aucun faux succès |
| Lecteur d’écran réel | NOT_VERIFIED |
