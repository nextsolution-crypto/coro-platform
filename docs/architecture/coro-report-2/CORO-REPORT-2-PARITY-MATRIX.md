# CORO Report 2.0 — Matrice Reportperfect / CORO

| Capacité | Preuve Reportperfect | CORO actuel | Écart | Cible |
|---|---|---|---|---|
| Modèles personnalisables | Confirmé par source | Oui, versionnés | UX administration à compléter | P0 |
| Requis/facultatif | Confirmé par source | Oui | Aucun majeur | Couvrir en recette |
| Listes normalisées | Confirmé par source | Oui | Gestion centralisée limitée | P0 |
| Champs conditionnels | Confirmé par source | Oui, 4 opérateurs | Arbres imbriqués/conditions multiples | P1 |
| Auteur/horodatage | Confirmé par source | Oui, acteur typé | Aucun majeur | Couvrir en import |
| Personnes/véhicules | Historique confirmé | Types présents | UI répétable non typée | P0 |
| Photos/vidéos/PDF | Confirmé par source | Oui, politique MIME bornée | Vidéo selon politique/taille | P1 |
| Actions correctives | Confirmé par source | Moteur Followups séparé | Liaison UX rapport-suivi | P1 |
| Commentaires/collaboration | Confirmé par source | Décisions/commentaires | Fil collaboratif général absent | P1 |
| Audit/rétention | Confirmé par source | Oui | Recette de conservation à compléter | P1 |
| Recherche mot/date/nom/type | Confirmé par source | Filtres structurels | Plein texte contrôlé absent | P1 |
| Statistiques/tableaux | Confirmé par source | Non spécifique Report | Écart fonctionnel | P2 |
| Notifications | Confirmé par source | Infrastructure CORO existante | Non activée pour Report | P2 |
| SaaS/local | Confirmé par source | SaaS CORO | Pas de mode local | Hors cible initiale |
| Format export historique | Non confirmé | N/A | Bloquant pour mapping final | Export client requis |
| Champs exacts (>200 historique) | Historique seulement | Catalogue extensible | Parité champ-à-champ inconnue | Export/formulaires requis |

Les lignes « confirmé par source » décrivent une capacité, jamais un contrat
technique d’import. Les transformations restent `MANUAL_REVIEW` tant qu’un
artefact client ne démontre pas leur sémantique.
