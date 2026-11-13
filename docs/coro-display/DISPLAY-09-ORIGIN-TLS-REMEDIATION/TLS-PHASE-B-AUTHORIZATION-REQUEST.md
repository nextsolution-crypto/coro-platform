# Demande d'autorisation phase B

À approuver seulement après le run d'inspection approfondi :

- certificat dédié couvrant exclusivement `display.getcoro.io`;
- autorité et validation ACME confirmées;
- fichiers exacts du vhost et références de certificat confirmés par l'inventaire;
- reload du seul terminateur confirmé, sans restart applicatif;
- fenêtre de changement et tests des cinq SNI;
- rollback par retrait du seul vhost Display et restauration de configuration;
- aucun changement DNS/Cloudflare dans cette même opération.

L'autorisation actuelle ne couvre aucune de ces mutations.
