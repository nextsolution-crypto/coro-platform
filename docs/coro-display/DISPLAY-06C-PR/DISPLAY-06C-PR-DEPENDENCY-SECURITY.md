# DISPLAY-06C-PR — Sécurité des dépendances

## Runtime

`npm audit --omit=dev` : **0 vulnérabilité connue** dans les dépendances livrées au runtime.

## Développement

Audit complet backend : 30 occurrences (4 faibles, 23 modérées, 3 élevées, 0 critique). Elles se ramènent principalement à quatre avis transitifs :

- `deepmerge` (faible, prototype poisoning), via Nest CLI/Jest;
- `deepmerge-ts` (élevée, épuisement de pile), via `@prisma/config`/CLI Prisma;
- `glob` (modérée, parcours après annulation), via Nest CLI/Jest;
- `minimatch` (modérée, amplification/DoS), via ESLint, glob et couverture de tests.

Les paquets directs concernés (`@nestjs/cli`, `prisma`, `jest`, `typescript-eslint`) servent au build, aux migrations, tests ou lint; aucune chaîne d’import runtime du Player n’a été démontrée. Les correctifs proposés par npm impliquent notamment des changements majeurs Nest CLI, Prisma ou Jest. Aucun `--force` ni downgrade incohérent n’a été appliqué dans cette PR.

Action : ticket de maintenance dédié, mise à niveau contrôlée avec tests de migrations/build, puis ré-audit. Cette réserve n’est pas ignorée mais n’est pas un motif de modification non maîtrisée du candidat.
