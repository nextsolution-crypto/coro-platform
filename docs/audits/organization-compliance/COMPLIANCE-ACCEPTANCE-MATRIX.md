# Matrice d'acceptation — Conformité

| Domaine | Scénario | Statut | Preuve |
|---|---|---:|---|
| API | administrateur autorisé | PASS | HTTP 200 QA |
| Isolation | autre organisation absente | PASS | fixture deux organisations |
| Autorisation | opérateur affecté seulement | FAIL | COMP-002 |
| Données | zéro document explicite | PASS | `AUCUN_DOCUMENT` |
| Données | brouillon récent | FAIL | classé `CONFORME` |
| Données | document validé 10 mois | PASS_FORMULE | `AVERTISSEMENT`; règle métier non approuvée |
| Données | document validé 12 mois | PASS_FORMULE | `EXPIRE`; règle métier non approuvée |
| Données | bâtiment inactif | PASS | exclu |
| Données | projet archivé seul | PARTIAL | historique non expliqué |
| Sélection | projet récent sans document | FAIL | masque un document antérieur |
| Interaction | filtre de statut | PASS | trois lignes conformes attendues |
| Interaction | recherche texte automatisée | NOT_VERIFIED | l'injection synthétique n'a pas piloté l'état React de façon fiable |
| Résilience | 503 distinct du vide | FAIL | compteurs zéro sans alerte |
| Mutations | modification/preuve/statut | NON_APPLICABLE | aucun endpoint exposé |
| Export | fichier réel | NON_APPLICABLE | aucune fonction d'export |
| Portail | écran correspondant | NON_APPLICABLE | route absente |
| Chrome | 390x844 x 3 thèmes | PASS | 3 captures |
| Chrome | 768x1024 x 3 thèmes | PASS | 3 captures |
| Chrome | 1440x900 x 3 thèmes | PASS | 3 captures |
| Chrome | 2560x1440 x 3 thèmes | PASS | 3 captures |
| Accessibilité | noms/rôles DOM | PASS | arbre d'accessibilité |
| Accessibilité | lecteur d'écran réel | NOT_VERIFIED | moyen fiable absent |
| Production | disponibilité en lecture seule | PASS | session autorisée, 3 lignes observées |

`PASS_FORMULE` signifie uniquement que le code courant produit le seuil attendu;
ce n'est pas une validation de la règle métier.

