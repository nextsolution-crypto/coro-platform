# DISPLAY-06B-REVIEW — Enrôlement

Constat initial critique : le jeton liait un `deviceId`, mais un intercepteur pouvait présenter sa propre clé. Correction : `createInvitation()` exige maintenant `keyId` et clé publique préattestés; l'invitation conserve leurs empreintes et `enroll()` refuse toute substitution.

Le jeton aléatoire de 256 bits n'est conservé qu'en SHA-256, expire en 1 à 15 minutes, est invalidé lors d'une réémission et ne peut être consommé qu'une fois. Les tests couvrent interception, remplacement, réutilisation et double consommation. Les liaisons organisation/bâtiment/emplacement viennent du dossier serveur et ne sont jamais choisies dans la preuve.

Limite : l'atomicité démontrée est celle d'un registre en mémoire mono-processus. L'intégration doit effectuer `UPDATE ... WHERE used_at IS NULL` dans une transaction PostgreSQL et journaliser émission, invalidation, expiration et consommation.
