# Enrôlement

## Constats

Invitation opaque, empreinte SHA-256, Ed25519 préattestée, expiration et consommation atomique sont présentes. Le service refuse les portées divergentes et l’activation hors état `PENDING_ENROLLMENT`.

## Corrections et tests

La portée localisation est désormais imposée en base. Les doubles consommations concurrentes donnent une seule réussite. Mauvaise clé, signature, expiration, suspension et révocation sont refusées par les tests ciblés.

## Limites

La création autorisée de l’appareil et de l’invitation n’a pas d’endpoint administratif gouverné; elle nécessite encore une opération directe/outil absent.
