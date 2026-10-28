# CORO WEB-AI-FINAL — Rapport QA

## Résultats locaux

| Contrôle | Résultat |
|---|---|
| Tests ciblés WEB-AI backend | 30/30 PASS |
| Suite backend | 2 247 PASS, 2 SKIP, 1 FAIL environnemental |
| Tests PostgreSQL Public Knowledge | 5/5 PASS |
| Suite PostgreSQL | 388 PASS, 6 FAIL environnementaux |
| Tests site | 717/717 PASS |
| Test widget additionnel | 8/8 PASS |
| Politique runtime/déploiement | 16 PASS, 1 SKIP Linux |
| TypeScript backend et site | PASS |
| ESLint ciblé | PASS |
| Builds backend et site | PASS |
| Audit runtime backend/site | 0 vulnérabilité |

Les sept échecs environnementaux (un unitaire, six PostgreSQL) proviennent du même prérequis Poppler absent sous Windows (`pdftoppm`/PDF_INVALID) dans le parcours OCR Knowledge privé, indépendant des changements WEB-AI publics. Le test ciblé Public Knowledge avec 38 sources réussit.

## Recette fonctionnelle

PostgreSQL 16 jetable, 156 migrations, 38 sources publiques. API réelle : FR `SUPPORTED`, quatre citations; EN `PARTIALLY_SUPPORTED`, deux citations. Les citations contiennent titre, version, URL canonique et extrait. L'injection produit une abstention.

Chrome réel et Chrome headless : 320, 375, 390, 768, 1024, 1440 et 1920 px; aucun débordement horizontal, aucune erreur console, citations présentes. Captures locales sanitizées : `%TEMP%/coro-web-ai-final-browser`.

Réserve non bloquante : la page anglaise conserve la dette historique `html[lang]=fr`; son contenu et le widget sont bien anglais.
