# DISPLAY-06B-INTEGRATION — Enrôlement

Les invitations opaques de 256 bits sont stockées par digest, expirent rapidement, sont invalidées lors d'une réémission et consommées une seule fois. Elles sont liées au dossier serveur et à une clé Ed25519 préattestée (`keyId` et empreinte de clé), empêchant un intercepteur d'enrôler sa propre clé.

Les tests couvrent validité, expiration, interception, réutilisation et double consommation. La transaction PostgreSQL réelle demeure un contrat DISPLAY-06C; l'atomicité actuelle est mono-processus.
