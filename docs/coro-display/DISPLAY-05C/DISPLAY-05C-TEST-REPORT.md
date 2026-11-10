# Rapport de tests

Résultats confirmés:

- Prisma validate/generate: PASS.
- TypeScript backend/frontend: PASS.
- migrations PostgreSQL 16 et seconde passe: PASS.
- tests unitaires workflow: 4/4 PASS, incluant clé idempotente inter-observation et verrou périmé.
- régressions Display/client ciblées: 24 PASS, 1 test conditionnel ignoré.
- contrats frontend DISPLAY-05A/05C: PASS.
- contrat portail DISPLAY-05B: PASS.
- build backend: PASS.
- build frontend production: PASS (accès réseau requis par `next/font` existant).
- TypeScript et build portail client: PASS.
- audit npm runtime backend/frontend: 0 vulnérabilité.
- audit npm complet: backend 30 vulnérabilités de développement (4 faibles, 23 modérées, 3 élevées); frontend/portail 8 modérées. Les corrections proposées imposent des ruptures majeures et n'ont pas été appliquées automatiquement.
- navigateur authentifié: NOT_VERIFIED.

Les audits de dépendances et contrôles finaux sont consignés dans le rapport de remise.
