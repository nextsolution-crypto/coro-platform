# Cache persistant

## Constats

Écritures atomiques, permissions, rejet des liens symboliques, vérification SHA-256 et réauthentification du manifeste au chargement sont présentes. La génération précédente est conservée.

## Tests et limites

Corruption, interruption et rollback sont couverts par les tests 06B. Le cache n’est pas raccordé au binaire connecté; saturation disque et révocation récupérée du serveur restent non vérifiées bout en bout.
