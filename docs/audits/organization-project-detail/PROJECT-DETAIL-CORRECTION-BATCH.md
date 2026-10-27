# Lot de correction proposé — fiche projet organisation

Ce document est une proposition issue de l'audit. Il **n'autorise pas** de modification produit, de migration, de fusion ou de déploiement.

## Ordre 1 — frontières serveur (bloquant)

1. Remplacer le corps `any` de `PUT /projects/:id` par un DTO en allowlist.
2. Interdire ou gouverner explicitement `clientId` et `buildingId`; si une réaffectation est admise, valider dans une transaction : organisation du projet, client de cette organisation, bâtiment du client et permission exacte de l'acteur.
3. Appliquer `projectAccessWhere(actor)` à `quality-score` avant toute lecture documentaire.
4. Formaliser la politique des projets `isActive=false`; par défaut recommandé, les exclure de la lecture directe et des ressources annexes ordinaires comme de la liste.
5. Ajouter les tests multi-tenant, non affecté, désactivé et combinaison client/bâtiment incohérente. Vérifier absence d'audit de succès, fichier, notification ou tâche sur refus.

Critère de sortie : aucune substitution d'identifiant ne modifie une relation; toutes les lectures directes et annexes ont la même portée que la liste.

## Ordre 2 — intégrité des mutations

1. Réduire la mise à jour générique aux champs réellement autorisés.
2. Si l'édition concurrente est conservée, ajouter une précondition (`lockVersion` recommandé ou `updatedAt`) et une réponse 409 explicite.
3. Rendre l'audit de changement d'état transactionnel avec la mutation, ou garantir une stratégie outbox/idempotente.
4. Renommer « Supprimer définitivement » en « Désactiver » et décrire l'effet réel.

Critère de sortie : une session obsolète ne peut écraser silencieusement une modification; double soumission idempotente; libellé conforme à l'état persisté.

## Ordre 3 — état principal et zones secondaires

1. Introduire des états distincts : chargement, 401, 403, 404, indisponible/réseau.
2. Ajouter une alerte accessible et une action Réessayer pour les erreurs récupérables.
3. Conserver le projet courant seulement avec identité et fraîcheur explicites; nettoyer avant changement d'identifiant/perte d'accès.
4. Remplacer les `catch` silencieux des zones secondaires par états indépendants et retries locaux.
5. Inclure `projectId` dans la dépendance de chargement et annuler/ignorer les réponses obsolètes.

Critère de sortie : 401/403/404/503 et panne secondaire produisent des états différents, sans faux vide, faux zéro ni mélange de projets.

## Ordre 4 — responsive et hiérarchie d'actions

1. Empiler l'en-tête à 390 px et contenir toutes les actions dans un groupe reflow ou un menu secondaire accessible.
2. Passer la grille des étapes à une colonne sur mobile, puis trois colonnes à un breakpoint adapté.
3. Conserver statut et prochaine action visibles en premier; déplacer Journal/Activités/Modèle/Procédures/Mandat dans une hiérarchie secondaire.
4. Tester textes longs, menus, modales, navigation latérale, focus et cibles tactiles.

Critère de sortie : 12/12 configurations, aucune bounding box d'action hors conteneur/viewport, aucune coupure et navigation clavier complète.

## Ordre 5 — clarté produit (décision préalable)

1. Décider si création, dernière modification et échéance doivent être affichées et quelle source gouverne l'échéance.
2. Nommer la progression (« grandes étapes documentaires ») et afficher sa date/source de mise à jour.
3. Distinguer qualité non calculable, aucune donnée et erreur de calcul.
4. Décider si client et bâtiment doivent être des liens, selon les permissions canoniques.

Critère de sortie : définition produit approuvée, valeurs synthétiques connues et absence de valeur de secours trompeuse.

## Campagne de recette minimale après correction

- tests unitaires/service des quatre frontières d'identifiants;
- PostgreSQL avec deux organisations et deux sessions concurrentes;
- API : affecté, non affecté, ADMIN, autre organisation, inactif, archive et désactivé;
- erreurs 401/403/404/503, réseau, lenteur, panne secondaire et réponse obsolète;
- Chrome 390/768/1440/2560 × Classic/Glass Light/Glass Dark;
- retour liste, URL directe, F5, précédent/suivant;
- preuve d'absence d'effet secondaire sur chaque refus.

## Découpage recommandé

- PR A : DTO, cohérence tenant et portée quality-score/désactivation.
- PR B : concurrence, audit et sémantique de désactivation.
- PR C : résilience, chargements et annulation des requêtes.
- PR D : responsive et hiérarchie UX.

Chaque PR doit rester séparément réversible et ne pas rouvrir les campagnes dashboard/liste sans indice de régression.
