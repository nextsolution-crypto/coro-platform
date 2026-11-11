# DISPLAY-06B-REVIEW — Modèle de menaces

| Menace | Garantie démontrée | Limite résiduelle |
|---|---|---|
| Jeton intercepté/réutilisé | clé attendue préattestée, digest du jeton, expiration, usage unique | transaction PostgreSQL absente |
| Appareil/clé usurpés | preuve Ed25519 et portée device/opération/requête | protection matérielle de clé absente |
| Nonce rejoué | ledger borné, snapshot restaurable | persistance automatique absente |
| Tenant/bâtiment/emplacement étranger | manifeste signé et portée stricte, trois tenants testés | enforcement HTTP/DB absent |
| Registre falsifié/ancien | signature racine, version croissante, signer attendu | version persistante/rotation racine absentes |
| Rendu/cache substitué | SHA-256, vérificateur de manifeste obligatoire, anti-rollback | chiffrement disque absent |
| Temp/symlink/TOCTOU | portée contenue, liens symboliques refusés, sérialisation intra-processus | verrou interprocessus/ACL OS non vérifiés |
| Crash/coupure | fichier, `fsync`, rename, génération précédente | panne électrique matérielle non testée; Windows ne synchronise pas le répertoire |
| Urgence effacée | MAC, version/priority monotones, clear explicite | autorité du clear dépend du futur Gateway |
| Kiosque/contenu/watchdog | CSP, flags refusés, signatures et restart budget | shell et superviseur OS absents |

L'attaquant réseau ne peut pas produire les signatures attendues. Un administrateur local ou OS compromis reste hors de la frontière cryptographique locale et exige durcissement, ACL et stockage matériel.
