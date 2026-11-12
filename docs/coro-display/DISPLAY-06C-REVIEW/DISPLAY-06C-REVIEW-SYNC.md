# Synchronisation

## Constat et correction

Une confirmation tardive pouvait ramener `lastAcceptedManifestSequence` à une valeur inférieure et déclarer une version arbitraire. La transaction vérifie maintenant la publication encore valide, sa version et avance atomiquement la séquence uniquement.

## Tests

Le rollback de séquence est refusé et ne confirme pas le sync. Le protocole cache refuse téléchargement incomplet, manifeste invalide et empreinte divergente.

## Limite bloquante

Le binaire `connected-player-main` n’appelle pas ce protocole. Le parcours HTTP → téléchargement → cache → activation → confirmation n’est donc pas exécutable bout en bout.
