# Durabilité disque

## Constats

`atomicWrite` crée un fichier exclusif mode 0600, écrit, `fsync` le fichier, renomme puis synchronise le répertoire sur les plateformes non Windows. Le cache retient une génération précédente.

## Qualification

Atomicité logique: PASS synthétique. Durabilité après crash de processus: démontrée par redémarrage E2E. Sur Windows, le répertoire n'est pas synchronisé; arrêt brutal et panne électrique réelle: NOT_VERIFIED. Aucun PASS matériel n'est revendiqué.
