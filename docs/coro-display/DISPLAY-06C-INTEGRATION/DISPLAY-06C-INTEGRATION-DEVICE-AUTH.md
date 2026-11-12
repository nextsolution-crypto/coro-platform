# Authentification appareil

Invitation opaque, empreinte du jeton, expiration, clé Ed25519 préattestée, preuve de possession et consommation atomique sont conservées. La machine d’états interdit explicitement `PENDING_ENROLLMENT → ACTIVE`; suspension/reprise est gouvernée et les états terminaux sont immuables.

Tests de non-régression : 7/7 PASS, incluant activation sans enrôlement.
