# DISPLAY-02B — Préparation à la livraison

## État

Le candidat local est réconcilié, compilé et testé. La migration est additive, l'autorité est restrictive par défaut et la compatibilité applicative descendante est préservée.

## Avant PR

1. Autoriser explicitement le push et l'ouverture d'une PR.
2. Vérifier à nouveau `origin/main` au moment de la publication.
3. Rejouer CI, migration depuis zéro et test PostgreSQL sur le HEAD publié.
4. Examiner tout nouveau conflit de migration ou de schéma.

## Avant fusion ou déploiement

Une autorisation distincte reste obligatoire. Il faudra alors vérifier sauvegarde, restauration, capacité, tête réelle des migrations, rollback applicatif et inspection post-release.

## Limites

Ce lot ne rend aucun écran Player opérationnel et ne permet aucune commande d'urgence. Il ne constitue aucune reconnaissance réglementaire d'un écran comme substitut à un plan mural.
