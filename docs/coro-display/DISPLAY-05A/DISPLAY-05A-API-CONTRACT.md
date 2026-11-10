# Contrat API

## GET display-manager

Retourne `generatedAt`, `capabilities`, `dashboard`, `buildings`, `plans`, `eligiblePdfSources`, `recentEvents`.

- `plans` est vide sans `DISPLAY_PLAN_READ`.
- `eligiblePdfSources` est vide sans `DISPLAY_PLAN_CREATE`; seuls les PDF `APPROVED`, non révoqués et non remplacés sont retenus.
- `recentEvents` est vide sans `DISPLAY_AUDIT_READ`.
- aucun `storageKey`, octet privé ou URL publique n'est retourné.
- `devices.available=false` tant qu'aucune autorité de périphériques n'existe.

Les mutations emploient un `requestId` UUID, le `expectedLockVersion` et un motif explicite. L'approbation/publipostage avancé conserve le contrat visuel exact existant.
