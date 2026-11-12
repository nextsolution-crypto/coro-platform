# Tests adversariaux indépendants

## Couverture

- Manifeste Gateway vérifié par le validateur Player réel.
- Confirmation ancienne/rollback refusée.
- DTO `proof` imbriqué invalide refusé en HTTP 400.
- Localisation d’une autre organisation refusée par PostgreSQL.
- Nonce avec organisation substituée refusé par PostgreSQL.
- Enrôlement concurrent et journal append-only revérifiés.

## Résultat

Tests ciblés indépendants et historiques : PASS. Les tests ne démontrent pas un runtime connecté, un OS kiosk ni trois organisations complètes.
