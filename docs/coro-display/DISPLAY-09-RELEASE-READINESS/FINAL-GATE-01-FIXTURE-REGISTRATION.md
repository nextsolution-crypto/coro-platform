# Gate 1A — enregistrement DemoFixtureRecord

Le modèle impose deux unicités : `(organizationId, fixtureNamespace, fixtureKey)` et `(organizationId, entityType, entityId)`. L'inventaire de production a démontré zéro enregistrement actif pour le bâtiment.

La mutation conditionnelle n'a pas été exécutée : la preuve directe du caractère fictif manque. Créer maintenant un `DemoFixtureRecord` ferait de l'enregistrement sa propre justification et violerait le mandat.

Lorsque la provenance sera établie indépendamment, l'opération devra être transactionnelle, verrouillée, idempotente, limitée à l'organisation et au bâtiment canoniques, auditée, sans modification du bâtiment/client/projets/documents/occupants/permissions, et accompagnée d'un retrait ciblé qui refuse toute collision.

**Mutation effectuée : NON. Verdict : BLOCKED_BY_PROVENANCE.**
