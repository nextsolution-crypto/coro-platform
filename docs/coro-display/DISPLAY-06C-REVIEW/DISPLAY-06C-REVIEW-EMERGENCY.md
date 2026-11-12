# Persistance d’urgence

## Constats

L’état est HMACé, versionné, écrit atomiquement et interdit un downgrade sans sortie gouvernée. Les urgences simulées survivent aux redémarrages de processus dans les tests.

## Limites

La clé HMAC n’est pas fournie par un keystore OS dans l’exécutable actuel. Aucun superviseur réel ne restaure ce magasin au démarrage; la persistance matérielle est `NOT_VERIFIED`.
