# Enrôlement

Le professionnel pré-enregistre la clé publique Ed25519. Le token opaque n'est conservé que sous SHA-256 et n'est retourné qu'à la création. L'enrôlement HTTP vérifie la preuve de possession, l'étendue complète et consomme l'invitation dans une transaction sérialisable.

Le scénario E2E a enrôlé l'appareil synthétique puis rejoué la même invitation : le second appel a été refusé avec HTTP 410. Les tests PostgreSQL couvrent concurrence, mauvaise clé, expiration et portée étrangère.
