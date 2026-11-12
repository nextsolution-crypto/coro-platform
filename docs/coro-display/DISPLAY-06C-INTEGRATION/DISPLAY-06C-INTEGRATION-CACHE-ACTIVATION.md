# Cache et activation

`PersistentPlanCache` vérifie manifeste et SHA-256 avant écriture, écrit dans `next`, conserve `previous` puis renomme atomiquement. Les liens symboliques, échappements de portée, corruption et rollback sont refusés.

Le dernier plan valide reste lisible lorsque le Gateway est arrêté. PASS.
