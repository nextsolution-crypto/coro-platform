# Plan de rollback

Les quatre images actives et les quatre images de rollback sont presentes (`rollbackReady=true`). Le candidat Display applique 11 migrations additives; aucune table ni donnee metier existante n'est supprimee. Une colonne d'audit est rendue nullable et les nouvelles tables/colonnes Display peuvent rester en base apres retour applicatif.

Rollback autorise : revenir atomiquement aux quatre images precedentes, restaurer le compose precedent, revoquer les sessions/invitations Display du pilote, desactiver l'entree Display et retirer le routage/DNS du sous-domaine si celui-ci a ete ajoute.

Ne pas retrograder PostgreSQL et ne pas supprimer les tables Display. Le backend precedent ignore les structures additives, mais ne fournit plus Display : le pilote doit alors etre marque indisponible. Conserver les journaux et les fixtures jusqu'a qualification; retirer seulement les ressources portant la cle externe deterministe apres verification de zero reference non demo.

NO-GO rollback si l'ensemble des quatre images precedentes, le compose, les cles ou les workers ne sont pas compatibles. La verification doit etre repetee juste avant release.
