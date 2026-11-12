# Contrats existants réutilisés

- Incident : `IncidentEvent`, autorité par permissions/affectations, `IncidentLog`, tâches et audit.
- Documents : `DisplayPlanPublication` seulement en `PUBLISHED`, non révoquée et avec empreinte de variante.
- Spatial : `SpatialAuthorizationService`, `displayPermissions`, `displayBuildingIds`, étages, zones et emplacements.
- Gateway : challenge, nonce consommable, signature Ed25519, horodatage borné, appareil ACTIVE non révoqué.
- Player : cache vérifié, manifeste signé, état d’urgence HMAC, journal local chaîné, watchdog.

CORO Ops ne fournit pas encore un moteur d’orchestration complet exploitable ici. DISPLAY-07 accepte `CORO_OPS` uniquement avec une référence `protocolId`; ce n’est pas une preuve que le protocole documentaire est exécutable.
