# DISPLAY-06A-INTEGRATION — Cache

Le protocole `stage → validate → commit` exige un token par transaction. Un token invalide ou déjà consommé est refusé, et deux synchronisations concurrentes ne peuvent intervertir leur candidat. Une validation échouée ne supprime pas le plan courant.

Le cache testé est logique et en mémoire. Atomicité disque, `fsync`, quotas, chiffrement OS, crash et panne électrique restent **NOT_VERIFIED**.
