# CLIENT-01B — Contrat de provenance typée

## Frontière canonique

Toute action métier est dérivée de l’autorité authentifiée serveur. Le navigateur ne fournit jamais `actorType`, `actorId`, le tenant ni les permissions. Les acteurs humains sont `USER` ou `CLIENT_USER`; les automatismes historiques restent `SYSTEM` et ne sont jamais authentifiables.

`CoroActorIdentity(organizationId, actorType, actorId)` matérialise l’identité canonique. Ses contraintes PostgreSQL exigent exactement une FK concrète vers `User` ou `ClientUser`, ou une clé système distincte. Les tables Report et Opérations référencent ce triplet, ce qui interdit un identifiant fabriqué et toute provenance inter-tenant.

## Autorisation

- `USER`: identité active, permission de plateforme explicite et affectation bâtiment active.
- `CLIENT_USER`: identité active, permission opérationnelle explicite et affectation `ClientOperationalBuildingAssignment` active.
- Report exige en plus l’autorité Incident applicable et `INCIDENT_READ`.
- Les gardes internes ne sont pas réutilisés par les routes client; CLIENT-01C devra utiliser `ClientJwtGuard` et construire `CoroAuthority` depuis l’identité canonique.

## Compatibilité

Les anciennes colonnes `...UserId` sont conservées et rétroremplies. Elles deviennent optionnelles uniquement là où un `CLIENT_USER` doit pouvoir agir. Les nouveaux triplets typés sont canoniques. Aucun historique n’est réécrit ni fusionné.

## Immutabilité

Les décisions, audits et historiques sont append-only par trigger PostgreSQL. Une nouvelle action produit un nouvel événement; une correction ne falsifie jamais l’acteur historique.
