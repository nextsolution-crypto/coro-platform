# PostgreSQL

## Constats et preuves

La migration source est additive mais ses FK de localisation ne portaient pas organisation et bâtiment. Une migration corrective additive ajoute les clés composites pour appareil, invitation, nonce, affectation, séquence et synchronisation/publication.

## Tests

PostgreSQL 16 jetable : 184 migrations, seconde passe sans attente, création interclient refusée, nonce d’une autre organisation refusé, enrôlement concurrent à consommation unique, journal append-only.

## Limites et risque résiduel

La rétention/nettoyage des nonces et événements n’est pas implémentée. La base partagée n’a pas été touchée.
