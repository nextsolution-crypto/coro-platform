# DISPLAY-06B-REVIEW — Préparation DISPLAY-06C

Prérequis bloquants avant pilote : tables PostgreSQL additives avec transactions d'invitation/nonces/version de confiance; Gateway HTTP authentifié; persistance automatique du snapshot anti-rejeu; liste de révocation; autorité de clear d'urgence; keystore OS; shell Chromium avec CSP effective; verrou/cache interprocessus; heartbeat et superviseur OS.

DISPLAY-06C devra intégrer ces contrats sans affaiblir les validations, puis tester migrations isolées, trois tenants, redémarrage, perte réseau, cache révoqué, navigateur et matériel. La revue n'a développé aucun de ces adaptateurs.

Le test PostgreSQL pertinent est présent mais **SKIPPED** faute de base de test configurée; aucune migration n'a été ajoutée ou appliquée pendant la revue.
