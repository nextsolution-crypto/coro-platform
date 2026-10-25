# Point de reprise — chantier CORO Client

Mise à jour : 25 octobre 2026, America/Toronto.

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

- Dernier commit produit déployé :
  `5d6e370c7a52c55fefacc2676c37142fccf4117b`, PR #53.
- Production active vérifiée :
  `5d6e370c7a52c55fefacc2676c37142fccf4117b`.
- Worktree isolé : `F:\coro-platform\.worktrees\client-project-scope`.
- Worktree principal `F:\coro-platform` et travaux P-5 : préservés, non modifiés.

## Modifications livrées ou fusionnées

- CP-002 : le scope `CLIENT_MANAGER` combine désormais organisation, client et
  bâtiments explicitement affectés pour les listes projets/bâtiments.
- Les lectures bâtiment et les ressources annexes utilisant
  `assertBuildingAccess` appliquent le même couple client/bâtiment.
- Le scope historique organisation-wide de `CLIENT_CORPORATE` est préservé.
- CP-006 : les commentaires, versions, engagements, signatures et exports
  héritent du contrôle d’accès canonique de leur projet; les téléchargements
  ProjectFile respectent la portée organisationnelle corporate autorisée.
- CP-007 : les commentaires distinguent `INTERNAL_USER` et `CLIENT_USER` avec
  exactement un auteur canonique; aucun identifiant d’auteur du navigateur
  n’est accepté.
- CP-005 : le refus vérifie accès, rôle et état avant transaction; une victoire
  concurrente unique produit le commentaire et les notifications, une répétition
  est sans effet.
- CP-004 : portée Intelligence filtrée avant agrégation et échec API présenté
  explicitement avec reprise utilisateur.

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
- CP-006 : release `40116294651` SUCCESS; inspection `40117291362` PASS/GO.
- CP-007 + CP-005 : release `40118313963` SUCCESS; inspection `40119271708`
  PASS/GO; SHA actif `3829afc…`, PostgreSQL 16.15, 153 migrations, head
  `20261107010000_project_comment_typed_actor`, backup `REMOTE_VERIFIED`,
  restore `RESTORE_VERIFIED`, quatre rollback disponibles.
- CP-004 : CI PR `40117984030` SUCCESS. La release `40119347659` a échoué
  fail-closed avant mutation. L’audit capacité `40120197159` mesure
  11 846 500 352 octets libres pour 14 020 728 037 requis.
- CP-004 recette finale : API 8/8 PASS; navigateur 16/16 PASS, dont matrice
  12/12; release `40192799857` SUCCESS; inspection `40193617786` PASS/GO;
  153 migrations, backup/restore vérifiés et quatre rollback disponibles.
- CORE-01/DOC-01 : API 14/14 PASS; navigateur interne 13/13 PASS; PDF de
  4 003 607 octets ouvert et parsé (98 pages), empreinte conservée dans le
  rapport d'acceptation.

## Constats ouverts

Voir `CLIENT-PORTAL-FINDINGS.md`. CP-001 à CP-007 sont CLOS. Le verdict
commercial global demeure ouvert; la campagne conclut seulement à un pilote
encadré pour CP-004 et les sous-parcours CORE-01/DOC-01 explicitement prouvés.

## Opérations au résultat incertain

- Aucune mutation métier ou communication n’est en cours.
- Aucune opération importante ne demeure ambiguë. La release finale
  `40192799857` est terminale SUCCESS et réconciliée par `40193617786`.

## Prochaine action concrète

Lever séparément les limites DOC-01 `NOT_VERIFIED` consignées dans
`CP004-CORE01-DOC01-ACCEPTANCE.md`, puis reprendre les campagnes suivantes du
registre sans rouvrir CP-002/CP-003 hors preuve de régression.
