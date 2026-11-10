# Dépendances et sécurité

Les trois applications ont été installées avec `npm ci`; aucun `audit fix` ni changement de lockfile.

Audits runtime : 0 vulnérabilité backend, frontend et portail. Audits complets : backend 30 (4 faibles, 23 modérées, 3 élevées), frontend 8 modérées, portail 8 modérées. Elles concernent les chaînes de développement/test (`Jest`, `Prisma CLI`, `typescript-eslint`, `eslint-config-next`, `minimatch`). Les correctifs proposés impliquent notamment Prisma 7 ou des changements majeurs incompatibles avec l’épinglage 6.19.3; aucun upgrade risqué n’a été appliqué.

Le runtime de production demeure sans vulnérabilité rapportée. Le scan ciblé ne détecte aucun nouveau secret. Les DTO stricts et validations texte réduisent XSS et mass assignment.

Risque résiduel : suivre les avis dev-tooling et corriger dans un chantier de dépendances dédié.
