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

- Branche : `fix/client-project-building-scope`.
- Base : `origin/main` au SHA `d8dab2a48e6872d23024a717df33e1dca8994d58`.
- Production active vérifiée : `d8dab2a48e6872d23024a717df33e1dca8994d58`.
- Worktree isolé : `F:\coro-platform\.worktrees\client-project-scope`.
- Worktree principal `F:\coro-platform` et travaux P-5 : préservés, non modifiés.

## Modifications en cours

- CP-002 : le scope `CLIENT_MANAGER` combine désormais organisation, client et
  bâtiments explicitement affectés pour les listes projets/bâtiments.
- Les lectures bâtiment et les ressources annexes utilisant
  `assertBuildingAccess` appliquent le même couple client/bâtiment.
- Le scope historique organisation-wide de `CLIENT_CORPORATE` est préservé.

## Tests exécutés

- CP-002 phase rouge : 7 échecs reproduisant les filtres manquants.
- `client-portal.service.spec.ts` : 70/70 PASS après correction.
- Les validations TypeScript, PostgreSQL, CI et recette synthétique restent à
  exécuter avant publication.

## Constats ouverts

Voir `CLIENT-PORTAL-FINDINGS.md`. CP-001 est CLOS. CP-002 et CP-003 sont
corrigés localement, en attente de la CI PostgreSQL et de la recette contrôlée.
CP-004 et CP-005 sont confirmés ouverts. CP-006 est confirmé pour les
commentaires, versions et engagements, tandis que les fichiers/téléchargements
restent à prouver. CP-007 est confirmé ouvert. Ces constats interdisent un feu
vert commercial global.

## Opérations au résultat incertain

- Aucune mutation métier, migration, communication ou production n’est en cours.
- Aucune opération CP-002 n’a encore été publiée ou déployée.

## Prochaine action concrète

Compléter les tests de non-régression, TypeScript et PostgreSQL, revoir le diff,
publier CP-002/CP-003, attendre la CI et recetter avec des données synthétiques.
Ensuite seulement, poursuivre CP-006, CP-005 puis CP-004 séparément.
