# Accusés de réception

États : QUEUED, DELIVERED, RECEIVED, APPLIED, REJECTED, FAILED, STALE, SUPERSEDED. Les transitions sont monotones; un terminal ne retourne pas vers APPLIED. Les doublons sont identifiés par `(deviceId, ackRequestId)`.

RECEIVED signifie que le Player a accepté l’enveloppe; APPLIED qu’il déclare la transition persistée et appliquée. Aucun des deux ne prouve la visibilité physique.
