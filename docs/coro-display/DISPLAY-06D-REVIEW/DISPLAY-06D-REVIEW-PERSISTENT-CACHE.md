# Cache persistant

## Constats et preuves

Le cache valide signature/manifeste, SHA-256, portée device/location, séquence monotone, symlinks et traversées. L'écriture `next → current`, avec génération `previous`, préserve un rendu antérieur vérifié. Les tests fondation/adversariaux et l'E2E offline/restart passent.

## Limites

La concurrence est sérialisée uniquement dans le processus Node. Deux processus distincts ne partagent pas la file mémoire. La durabilité Windows et la panne électrique physique ne sont pas démontrées. Verdict: PASS logiciel mono-processus; réserve opérationnelle multi-processus.
