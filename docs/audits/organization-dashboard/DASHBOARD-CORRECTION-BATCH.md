# Lot de correction proposé — dashboard organisation

Ce lot est prêt à autoriser, mais n'est pas lancé par cet audit.

## 1. Autorisation canonique des sources — prioritaire

1. Faire accepter un `AdviserActor` par `findUpcomingUpdates`, `findPendingApproval`, `getRecurringToRenew`, `getUpcoming` et la recherche globale.
2. Appliquer `projectAccessWhere(actor)` au projet parent avant toute projection.
3. Ajouter des tests PostgreSQL avec deux organisations, deux OPERATOR de la même organisation, affectations différentes et identifiants connus.
4. Vérifier les compteurs et métadonnées, pas seulement les listes.

Critère de sortie : aucune source du dashboard ne dépasse la portée de `/projects` et `/projects/:id`.

## 2. États fiables par widget

1. Remplacer les `catch(... => [])` par un résultat typé `success/error` par source.
2. Afficher `Indisponible` plutôt que zéro, avec Réessayer lorsque pertinent.
3. Traiter explicitement 401, 403, erreur réseau et erreur serveur.
4. Conserver les widgets sains lors d'une panne partielle.
5. Ajouter une date de fraîcheur fondée sur la dernière réponse réussie.

Critère de sortie : aucun échec simulé ne peut produire un faux zéro ou un faux état vide.

## 3. Raccorder “Mes tâches”

1. Identifier ou créer dans l'autorité de travail existante une lecture des tâches échues de l'acteur; ne pas ajouter une deuxième autorité.
2. Alimenter `lateTasks` et supprimer l'état positif non fondé.
3. Tester échéance, affectation, révocation et portée projet.

Critère de sortie : fixtures avec zéro, une et plusieurs tâches donnent les résultats exacts; panne distincte d'une absence réelle.

## 4. Checklist et accessibilité

1. Remplacer le test toujours vrai du conseiller par une donnée serveur canonique.
2. Remplacer les `div`/`tr` cliquables par liens/boutons ou ajouter la sémantique et le clavier complets.
3. Vérifier focus, noms accessibles, contraste et cibles tactiles.

Critère de sortie : la checklist correspond aux données et toutes les actions sont utilisables au clavier.

## 5. Recette finale ciblée

- PostgreSQL 16 et données synthétiques isolées;
- ADMIN, OPERATOR affecté, OPERATOR non affecté, utilisateur désactivé, organisation vide;
- états lent/vide/partiel/500/réseau/401/403/retry;
- quatre viewports × thèmes réellement proposés;
- F5, précédent/suivant, reconnexion et retrait d'affectation;
- aucune communication, signature ou opération d'urgence.

La livraison éventuelle devra être découpée en un lot sécurité/données puis un lot états/UX, afin de rendre la revue et le retour arrière compréhensibles.

