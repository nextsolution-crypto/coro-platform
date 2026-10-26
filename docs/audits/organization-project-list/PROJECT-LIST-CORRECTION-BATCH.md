# Lot de correction proposé — liste des projets

Le présent document n'autorise aucune modification produit. Il ordonne le lot minimal à soumettre à autorisation.

## Lot A — frontières métier bloquantes

1. Refuser côté serveur toute mutation générique d'un projet `ARCHIVED`.
2. Retirer la réactivation de la liste; ne créer aucun parcours de réouverture.
3. Séparer les permissions lecture, modification et désactivation; documenter l'autorité attendue pour la suppression.
4. Ajouter les tests sans effet secondaire : update, delete, sélection multiple et appels directs.

Critère de sortie : archive consultable mais immuable pour les rôles testés; aucune tâche, notification, version ou audit de succès lors d'un refus.

## Lot B — résilience et vérité de l'écran

1. Remplacer `Promise.all` par une orchestration distinguant la liste principale des dépendances secondaires.
2. Ajouter états erreur principale, erreur partielle, vrai vide et filtre sans résultat.
3. Ajouter Réessayer, fraîcheur et protection contre les réponses obsolètes.
4. Nettoyer projets et sélection lors d'un changement d'identité ou de périmètre.

Critère de sortie : 503/lenteur/session expirée ne produit jamais un faux zéro ni l'onboarding initial.

## Lot C — mutations et compteurs

1. Vider ou recalculer la sélection au changement d'onglet/filtre.
2. Confirmer exactement tous les objets mutés; empêcher doubles soumissions et gérer les échecs partiels.
3. Harmoniser le vocabulaire avec la désactivation réelle.
4. Exposer un résumé serveur canonique pour total actif, archives et consommation de licence.

Critère de sortie : aucun objet invisible n'est muté; compteurs et gate de création concordent avec le serveur.

## Lot D — accessibilité et minimisation

1. Transformer la navigation carte en lien natif et étiqueter les cases.
2. Exposer seulement les responsables actifs nécessaires au filtre.
3. Vérifier clavier, focus, lecteur d'écran, mobile et onglet Archives.

Critère de sortie : parcours complet au clavier et absence d'acteurs révoqués/non pertinents dans les filtres.

## Améliorations différables

- Recherche accent/casse sur nom, client et bâtiment.
- Filtres client, bâtiment, statut et période.
- Tri serveur explicite et pagination stable.
- Définition visible de la progression et du score qualité.

Ces améliorations doivent rester séparées des corrections bloquantes afin de conserver une revue compréhensible.

