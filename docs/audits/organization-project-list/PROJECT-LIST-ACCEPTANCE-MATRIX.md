# Matrice d'acceptation — liste des projets

| Capacité | Statut | Preuve |
|---|---|---|
| Route `/projects` et navigation | PASS | Code et rendu QA |
| Liste OPERATOR affectée | PASS | API réelle, fixture synthétique |
| Projet même tenant non affecté | PASS | absent liste; lecture directe 404 |
| Projet autre tenant | PASS | absent liste; lecture directe 404 |
| ADMIN organisation | PASS | voit le projet même tenant non affecté, pas l'autre tenant |
| Utilisateur désactivé | PASS | authentification refusée |
| Lecture archive autorisée | PASS | liste et lecture directe 200 |
| Archive strictement lecture seule | FAIL | réactivation serveur réussie |
| Création | NOT_VERIFIED | autorité statiquement inspectée; mutation UI non rejouée |
| Suppression multiple | FAIL | sélection masquée possible et libellé incohérent |
| Filtre responsable | PASS avec réserve | fonctionne côté UI; annuaire contient acteurs inactifs/non pertinents |
| Recherche liste | NON_APPLICABLE | fonction absente |
| Filtres client/bâtiment/statut/date | NON_APPLICABLE | fonctions absentes |
| Tri configurable | NON_APPLICABLE | fonction absente |
| Pagination | NON_APPLICABLE | fonction absente |
| Ordre par défaut | PASS avec réserve | `updatedAt desc`, non expliqué |
| Compteurs | FAIL | portée filtrée mélangée à la limite globale |
| Progression | PASS technique / NOT_VERIFIED métier | champ canonique affiché; définition non expliquée |
| Score qualité | NOT_VERIFIED | UI prévue, valeur non fournie par la liste |
| Chargement initial | PASS | état visible |
| Vrai vide | PASS avec réserve | affichage présent |
| Sans résultat filtre | PASS avec réserve | même message que le vide global |
| Erreur principale | FAIL | 503 présenté comme zéro/onboarding |
| Erreur partielle | FAIL conception | `Promise.all` rend les dépendances solidaires |
| Données périmées/polling | FAIL conception | échec silencieux, aucune fraîcheur |
| Session expirée | NOT_VERIFIED écran | comportement partagé non rejoué |
| Navigation fiche correcte | PASS serveur | même portée liste/direct; UI route canonique |
| Clavier et focus carte | FAIL | carte cliquable non native |
| Responsive Classic | PASS 4/4 | captures et géométrie |
| Responsive Glass Light | PASS 4/4 | captures et géométrie |
| Responsive Glass Dark | PASS 4/4 | captures et géométrie |
| Console critique | PASS 12/12 | aucune erreur critique |
| Débordement global/composant | PASS 12/12 | géométrie mesurée |

## Résultats techniques

- Chrome : **12/12 PASS** pour la géométrie et la console.
- API authentifiée : cloisonnement liste/direct **PASS**.
- Jest ciblé : **24/24 PASS**.
- Défaillances confirmées : archives lecture seule et état erreur principal.
- Les preuves du dashboard PR #99 ont servi uniquement de contexte; les résultats ci-dessus viennent de la campagne Projets dédiée.

