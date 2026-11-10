# Sécurité des dépendances

## Runtime production

`npm audit --omit=dev` backend : **0 vulnérabilité** sur 273 dépendances de production.

## Dépendances complètes

Backend : 30 avis (3 high, 23 moderate, 4 low), exclusivement dans l’outillage. Les trois high suivent `prisma 6.19.3 → @prisma/config → deepmerge-ts`. Le correctif proposé exige Prisma 7, incompatible avec le schéma épinglé; risque de build/CI conservé ouvert, sans `audit fix --force`.

Portail : 8 moderate dans la chaîne ESLint/minimatch, hors runtime. Le correctif proposé implique un changement de version majeur de configuration.

## Mitigations

Dépendances verrouillées, entrées CI contrôlées, aucun objet non fiable fourni aux outils de merge, audit runtime nul. Réévaluer lors d’une migration Prisma/Nest/ESLint planifiée.
