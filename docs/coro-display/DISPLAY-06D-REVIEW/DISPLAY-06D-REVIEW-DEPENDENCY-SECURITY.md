# Sécurité des dépendances

## Résultats

`npm audit --omit=dev --audit-level=high`: 0 vulnérabilité runtime. Audit complet: 30 vulnérabilités (4 faibles, 23 modérées, 3 élevées) dans la chaîne de développement (`deepmerge`, `deepmerge-ts`, `glob`, `minimatch` et dépendants).

## Analyse

Les alertes élevées ne sont pas dans l'arbre runtime installé avec `--omit=dev`, mais peuvent affecter build/tests/CI. Aucun `npm audit fix --force` n'a été utilisé. Les correctifs proposés impliquent des versions majeures Nest/Prisma et doivent être traités séparément avec tests de compatibilité.

## OCR

`pdftoppm` et `tesseract` ne sont pas installés sur l'hôte Windows: NOT_VERIFIED localement. Une validation Linux CI reste nécessaire.
