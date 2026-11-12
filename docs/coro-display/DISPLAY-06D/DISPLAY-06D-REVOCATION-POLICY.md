# Politique de révocation

Le registre local est trié, dédupliqué, écrit atomiquement et protégé HMAC. Toute version connue révoquée est exclue du cache. Une altération du registre produit `REVOCATION_STORE_INTEGRITY_FAILED`.

Pendant une coupure, une révocation décidée après la dernière mise à jour est nécessairement inconnue. Le Player doit signaler la date de connaissance et le mode dégradé; il ne peut pas prétendre être à jour. Au retour réseau, confiance et révocations précèdent toute nouvelle activation.
