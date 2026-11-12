# Sécurité

## Constat
Clé appareil, manifeste, loopback, révocations et journal sont les frontières critiques.

## Correction
Signer externe, Ed25519 obligatoire, confinement chemins/symlinks, anti-DNS-rebinding, méthodes/routes bornées, scope M2M et ancre monotone.

## Preuve et tests
Tests négatifs, ESLint ciblé, scan de secrets PASS et `npm audit --omit=dev`: 0 vulnérabilité.

## Résultat et risque résiduel
PASS logiciel; dette dev transitive suivie séparément.

