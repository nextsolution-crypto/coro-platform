# Matrice effective des permissions Paramètres

| Action | SUPER_ADMIN | ADMIN | OPERATOR | ClientUser | Résultat |
| --- | --- | --- | --- | --- | --- |
| Voir le catalogue | Oui | Oui | Oui, réduit côté UI | Non | PASS |
| Modifier profil personnel | Oui | Oui | Oui | Non | PASS |
| Modifier coordonnées organisation affichées | Oui | Oui | Refus service | Non | PARTIAL : stockage par User |
| Modifier logos | Oui | Oui | **Oui actuellement** | Non | FAIL |
| Lire membres | Oui | Oui | **Oui actuellement** | Non | FAIL |
| Créer OPERATOR/ADMIN | Oui | Oui | Non | Non | PASS |
| Créer SUPER_ADMIN | Oui | Non | Non | Non | PASS |
| Désactiver membre même tenant | Oui | Oui | Non | Non | PASS |
| Cible autre tenant | Gouvernance plateforme distincte | Non | Non | Non | PASS |
| Modifier Module 1 | Oui | Oui attendu | **Oui actuellement** | Non | FAIL |
| Gérer types d’activités tenant | Oui | Oui | Non | Non | PASS serveur |
| Gérer catégories timelog | Oui | Oui | Non | Non | PASS serveur |
| Gérer modèles de tâches tenant | Oui | Oui | Non | Non | PASS serveur |
| Soumettre feedback | Oui | Oui | Oui | Non | PASS |

SUPER_ADMIN n’est pas traité comme une autorité globale implicite : chaque route conserve son contrat tenant ou plateforme explicite.
