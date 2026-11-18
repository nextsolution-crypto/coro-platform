# CLIENT-01B — Release et rollback

## Release future

Cette PR ne doit pas être fusionnée ni déployée sans autorisation distincte. La migration est additive et doit être appliquée après sauvegarde distante vérifiée, test de restauration, capacité, verrou de release et images immuables. Les feature flags demeurent `false`.

## Rollback

Le rollback applicatif reste compatible avec les colonnes historiques conservées. Après application de la migration, ne pas improviser de migration descendante destructive: restaurer l’image précédente, laisser les colonnes additives en place et, si l’intégrité de données est compromise, restaurer le point PostgreSQL gouverné exact. Les triggers et FK ne doivent être retirés qu’au moyen d’un changement revu séparément.

## Activation

CLIENT-01B ne crée aucune permission, affectation ou route client. L’activation commerciale exige CLIENT-01C, une recette multirôle authentifiée et une décision de release distincte.
