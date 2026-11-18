# CORO Report CLIENT-01D — rapport QA

## Périmètre

Le lot ajoute une couche commerciale aux moteurs partagés livrés par
CLIENT-01C. Les 42 opérations conservent `ClientJwtGuard`, les permissions
individuelles, les affectations temporelles et les transactions existantes.
Les services d'accès Report, main courante, quarts, consignes et suivis exigent
désormais également la capacité commerciale correspondante.

## Vérifications

- Schéma : six valeurs additives, migration d'enum séparée de son utilisation PostgreSQL.
- Catalogue : six capacités, portée `SITE` seulement, aucun entitlement inséré.
- Politique : succès complet; flag non exact; autre tenant; affectation absente;
  entitlement révoqué; permission absente.
- Portail : garde `ClientJwtGuard` et décision non divulgatrice.
- Non-régression : contrôles d'accès historiques toujours exécutés après le garde commercial.
- Préparation Démo : manifeste désactivé, tenant canonique, `ACTIVE/SIMULATE`,
  bâtiments issus des fixtures actives, effets externes bloqués.

Les résultats de CI terminaux et les identifiants d'exécution seront ajoutés à
la PR. La recette navigateur n'est pas déclarée PASS dans CLIENT-01D.

## Restrictions conservées

- Aucun tenant activé.
- Aucun entitlement, compte, rapport ou donnée client créé.
- Aucun SMS, courriel, événement Sentinelle, Building Bridge ou webhook client.
- Aucun merge, déploiement ou changement de production dans ce mandat.

## Risques résiduels

La recette PostgreSQL complète et le portail natif CLIENT-01E doivent être
validés par la CI et une future recette authentifiée. Le manifeste prépare les
données synthétiques mais ne les provisionne pas. L'activation Démo exige une
autorisation distincte et des identités minimales confirmées.
