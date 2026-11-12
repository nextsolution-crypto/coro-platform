# Cache persistant

`PersistentPlanCache` vérifie signature, étendue, séquence et SHA-256, écrit `next` atomiquement, déplace `current` vers `previous`, puis active la nouvelle génération. Les chemins symboliques et sorties de périmètre sont refusés.

Le scénario E2E a restauré les mêmes octets après arrêt du Gateway et création d'une nouvelle instance Player. Les tests unitaires couvrent corruption, rollback, concurrence et génération précédente.
