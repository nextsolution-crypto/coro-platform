# Point de reprise — chantier CORO Client

Mise à jour : 24 octobre 2026, America/Toronto.

## Objectif et périmètre

Corriger le faux état vide de l’historique des incidents, clarifier les deux
historiques, valider et déployer le correctif, puis reprendre les constats de
cloisonnement dans l’ordre de risque. Aucun événement d’urgence, communication,
invitation, signature ou changement de permission n’est autorisé pour la recette.

## Autorisations acquises

- Utilisation en lecture/recette du compte de démonstration Martin Gagnon —
  Groupe Immobilier Prémont.
- Corrections, tests, PR, release gouvernée et recette ciblée.
- Aucun mot de passe, jeton ou secret n’est enregistré ici.

## Références

- Branche produit livrée : `fix/client-project-building-scope`.
- Commit/PR : `460a3ba8c20aff09c6b6012ff7b2bb54a1969b36`, PR #45.
- Production active vérifiée : `460a3ba8c20aff09c6b6012ff7b2bb54a1969b36`.
- Worktree isolé : `F:\coro-platform\.worktrees\client-project-scope`.
- Worktree principal `F:\coro-platform` et travaux P-5 : préservés, non modifiés.

## Modifications livrées

- CP-002 : le scope `CLIENT_MANAGER` combine désormais organisation, client et
  bâtiments explicitement affectés pour les listes projets/bâtiments.
- Les lectures bâtiment et les ressources annexes utilisant
  `assertBuildingAccess` appliquent le même couple client/bâtiment.
- Le scope historique organisation-wide de `CLIENT_CORPORATE` est préservé.

## Tests exécutés

- CP-002 phase rouge : 7 échecs reproduisant les filtres manquants.
- Tests unitaires ciblés : 76/76 PASS après correction.
- TypeScript et builds backend/Client Portal : PASS.
- PostgreSQL 16 : scénario synthétique multi-organisation et multi-client PASS
  dans `backend-tests`.
- CI PR `40112888019` : SUCCESS.
- Release `40113284582` : SUCCESS.
- Inspection post-release `40114255591` : PASS/GO; SHA, migration head, santé
  PostgreSQL, sauvegarde, restauration et rollback réconciliés.

## Constats ouverts

Voir `CLIENT-PORTAL-FINDINGS.md`. CP-001, CP-002 et CP-003 sont CLOS.
CP-004 et CP-005 sont confirmés ouverts. CP-006 est corrigé localement et son
inventaire de routes est documenté; la CI PostgreSQL et la recette contrôlée
restent obligatoires avant clôture. CP-007 est confirmé ouvert. Ces constats
interdisent un feu vert commercial global.

## Opérations au résultat incertain

- Aucune mutation métier, migration ou communication n’est en cours.
- CP-002 est publié, déployé et réconcilié; aucune opération incertaine ne reste.

## Prochaine action concrète

Publier et recetter CP-006 après la CI PostgreSQL. Traiter ensuite CP-007 dans
un lot distinct, puis CP-005 et CP-004, avec une preuve négative d’absence de
lecture, écriture, notification ou autre effet secondaire.
