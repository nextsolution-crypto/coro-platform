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

## Chrome 12/12

| Thème \ Format | 390×844 | 768×1024 | 1440×900 | 2560×1440 |
|---|---:|---:|---:|---:|
| Classic | PASS | PASS | PASS | PASS |
| Glass Light | PASS | PASS | PASS | PASS |
| Glass Dark | PASS | PASS | PASS | PASS |

Captures inspectées dans `D:\CORO-QA\tracking\organization-incident-list\browser`. Aucun débordement horizontal, aucune cible sous 44 px et aucune erreur console critique.

## Production

**NOT_VERIFIED.** Cette correction n’est ni fusionnée ni déployée.
