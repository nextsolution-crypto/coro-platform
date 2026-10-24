# CP-007 — Provenance typée des commentaires projet

## Défaut reproduit

Le portail client écrivait `ClientUser.id` dans `ProjectComment.userId`, alors
que cette colonne référençait exclusivement `User.id`. La création d'un
commentaire client n'avait donc aucune provenance relationnelle valide.

## Règle appliquée

- `INTERNAL_USER` référence exclusivement `User`;
- `CLIENT_USER` référence exclusivement `ClientUser`;
- l'identité vient de la session authentifiée, jamais du corps navigateur;
- l'organisation de l'auteur et celle du commentaire sont identiques par clé
  étrangère composite;
- exactement un auteur est obligatoire;
- les commentaires historiques conservent leur auteur interne et leur sens.

## Migration additive

`20261107010000_project_comment_typed_actor` ajoute `actorType` et
`clientUserId`, rend `userId` optionnel, classe les lignes historiques comme
`INTERNAL_USER`, puis impose les clés étrangères composites et la contrainte
exactement-un-auteur. Aucun commentaire n'est supprimé ni réécrit.

## Compatibilité de lecture

Les API internes et Client Portal chargent les deux relations typées et
présentent l'auteur canonique dans la vue compatible `user`. Les écrans
existants continuent donc d'afficher le nom et le rôle sans confondre les clés
étrangères persistées.

## Preuves attendues

- validation Prisma et TypeScript;
- création ClientUser et lecture des deux types d'auteurs;
- rejet PostgreSQL d'un auteur mixte ou absent;
- conservation d'un commentaire historique interne après migration;
- CI PostgreSQL depuis zéro et upgrade de la chaîne;
- recette authentifiée après déploiement.
