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

- Dernier commit produit fusionné :
  `e94e4f3d7b3a00406dcc56f0e5123a38235a3492`, PR #50 (CP-004).
- Production active vérifiée :
  `3829afc6563da5c196942b22d59f50131cea1e88` (CP-005 + CP-007).
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
- CP-004 : la correction de portée Intelligence est active en production sur
  `1e67c77ea5a3eb61fb4a8e32e30e92845411a277`.

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
- CP-004 : après extension gouvernée du Droplet à 2 vCPU, 4 Go et 80 Go,
  l’audit capacité `40121361626` mesure 43 116 140 480 octets libres,
  19 700 652 056 requis et 23 417 448 424 octets de marge. Release
  `40121511765` SUCCESS; inspection `40122406450` PASS/GO; 153 migrations,
  backup `REMOTE_VERIFIED`, restore `RESTORE_VERIFIED`, quatre rollback.

## Constats ouverts

Voir `CLIENT-PORTAL-FINDINGS.md`. CP-001, CP-002, CP-003, CP-005, CP-006 et
CP-007 sont CLOS côté serveur et production. La matrice navigateur synthétique
CP-004 demeure `NOT_VERIFIED`. Le verdict commercial global demeure ouvert;
la fermeture des constats de sécurité ne remplace pas CORE-01/DOC-01.

## Opérations au résultat incertain

- Aucune mutation métier ou communication n’est en cours.
- La tentative CP-004 `40119347659` est terminale `FAILURE`; l’inspection
  `40120103415` confirme que production est restée sur `3829afc…` et migration
  153. Il n’existe donc pas de déploiement CP-004 ambigu.

## Prochaine action concrète

Exécuter CORE-01 et DOC-01 selon `JOURNEYS.md` dans le runtime QA synthétique,
puis rejouer la matrice navigateur CP-004. Ne pas rouvrir CP-002/CP-003 hors
preuve de régression et ne pas utiliser les données d’un client de production
pour fabriquer une preuve de refus inter-client.
