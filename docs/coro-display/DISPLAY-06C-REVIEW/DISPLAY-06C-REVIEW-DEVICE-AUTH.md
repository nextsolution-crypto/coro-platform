# Authentification machine

## Constats et corrections

La preuve couvre appareil, timestamp, nonce, méthode, chemin et empreinte du corps canonique exécuté. La validation récursive du DTO `proof` a été ajoutée pour éviter les formes mal typées et erreurs 500.

## Tests

Signature invalide, mauvais chemin, corps modifié, timestamp périmé, nonce consommé et appareil non actif sont refusés. Les paramètres de requête ne sont pas utilisés par ces routes.

## Limites

TLS et horloge OS ne sont pas testés physiquement. Le challenge reste accessible par identifiant d’appareil mais inutilisable sans clé privée; le throttle limite l’abus.
