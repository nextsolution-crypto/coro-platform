# Architecture vérifiée

| Étape | Implémentation | État persistant |
|---|---|---|
| Registre/enrôlement | `device-administration.service.ts`, `device-gateway.service.ts` | `DisplayDevice`, invitations, événements |
| M2M | `device-gateway-http-client.ts`, `device-security.ts` | nonce PostgreSQL atomiquement consommé |
| Distribution | `DeviceGatewayService` + stockage privé | publication, affectation, sync |
| Player | `connected-player-service.ts` | `PersistentPlanCache` |
| Présentation | `LocalPlayerOrigin`, Chromium | octets du cache validé |
| Télémétrie | confirmation et heartbeat | sync et champs `last*` du device |
| Supervision | `display-manager.service.ts` | lecture filtrée par organisation/bâtiment |

Aucun fichier local codé en dur ne remplace le téléchargement : le WebP synthétique est d’abord stocké dans le stockage privé, puis reçu via le Gateway authentifié.
