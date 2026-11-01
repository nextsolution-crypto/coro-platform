# Matrice d'acceptation — Conformité

| Domaine | Scénario | Statut | Preuve |
|---|---|---:|---|
| API | administrateur autorisé | PASS | HTTP 200 QA |
| Isolation | autre organisation absente | PASS | fixture deux organisations |
| Autorisation | opérateur affecté seulement | PASS | politique canonique `projectAccessWhere(actor)` |
| Données | zéro document explicite | PASS | `NO_ACCESSIBLE_DOCUMENT` |
| Données | brouillon accessible seulement | PASS | `DRAFT_ONLY`, sans qualification réglementaire |
| Données | document approuvé accessible | PASS | `APPROVED_AVAILABLE`, date d'approbation enregistrée seulement |
| Données | document en révision | PASS | `IN_REVIEW`, sans échéance déduite |
| Données | bâtiment inactif | PASS | exclu |
| Données | projet archivé seul | PASS | `HISTORICAL_ONLY`, état factuel explicite |
| Sélection | projet récent sans document | PASS | toutes les sources accessibles sont examinées |
| Interaction | filtres d'état et client | PASS | QA synthétique et vérification production en lecture seule |
| Interaction | recherche texte | PASS | QA synthétique et vérification production en lecture seule |
| Résilience | 503 distinct du vide | PASS | alerte accessible, reprise et aucun faux compteur vide |
| Mutations | modification/preuve/statut | NON_APPLICABLE | aucun endpoint exposé |
| Export | fichier réel | NON_APPLICABLE | aucune fonction d'export |
| Portail | écran correspondant | NON_APPLICABLE | route absente |
| Chrome | 390x844 x 3 thèmes | PASS | 3 captures |
| Chrome | 768x1024 x 3 thèmes | PASS | 3 captures |
| Chrome | 1440x900 x 3 thèmes | PASS | 3 captures |
| Chrome | 2560x1440 x 3 thèmes | PASS | 3 captures |
| Accessibilité | noms/rôles DOM | PASS | arbre d'accessibilité |
| Accessibilité | lecteur d'écran réel | NOT_VERIFIED | moyen fiable absent |
| Production | disponibilité en lecture seule | PASS | SHA `cedbcbf4`, session autorisée, F5, filtres, recherche et source |
| Production | responsive authentifié | PASS | `390×844` et `1440×900`, aucun débordement horizontal |
| Production | console | PASS | aucune erreur observée pendant la recette ciblée |
| Release | inspection et réconciliation | PASS | runs `41308088727`, `41309283499`, `41309338858` |

Le verdict porte sur un suivi documentaire factuel. Il ne constitue pas une
attestation réglementaire et ne valide aucune règle d'échéance légale.

