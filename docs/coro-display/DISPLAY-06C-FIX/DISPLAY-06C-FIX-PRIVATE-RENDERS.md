# Rendus privés

`POST /device-gateway/renders/:publicationId` exige une preuve M2M. Le serveur résout lui-même l'affectation et la publication; le Player ne fournit jamais de chemin de stockage. Les octets sont relus via `StorageService`, puis leur SHA-256 est comparé avant réponse.

Le test E2E utilise un stockage privé réel sur disque temporaire. Aucune URL publique permanente n'est créée.
