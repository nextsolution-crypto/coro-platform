# CORO WEB-AI-02 — Acceptation finale locale

Date : 2026-10-27

Branche : `feature/web-ai-02-public-knowledge`

Base : `2cd919b6a0fa52fd4af59b9bdf61a3fcb5691ccf`

## Livré

- autorité de connaissance publique additive et bilingue;
- catalogue gouverné de sources et capacités;
- ingestion versionnée, idempotente, réconciliable et révocable;
- recherche hybride déterministe;
- citations canoniques;
- contrat API v1 sans contexte tenant;
- quotas, validation stricte, injection et URL allowlist;
- flag désactivé par défaut;
- corpus d'évaluation de 50 questions;
- tests PostgreSQL 16 d'isolation et de cycle de vie.

## Gates

| Gate | Verdict |
|---|---|
| Migration additive depuis zéro | PASS |
| Synchronisation et reprise | PASS |
| Recherche et citations | PASS |
| Isolation public/privé | PASS — identité SQL de lecture dédiée testée; provisioning production requis avant activation |
| API versionnée | PASS |
| Tests ciblés | PASS — 17 unitaires/HTTP + 4 PostgreSQL |
| Suite backend complète | PARTIAL — 2 212 PASS; OCR historique bloqué par `pdftoppm` absent; corrections WEB-AI-02 rejouées ciblées |
| TypeScript / ESLint ciblé / build | PASS |
| Fournisseur génératif réel | NON ACTIVÉ |
| Widget public raccordé | HORS WEB-AI-02 |
| Fusion / déploiement | NON |

## Réserves

1. La cause exacte du mode dégradé Anthropic en production reste indéterminée sans invocation ou télémétrie fournisseur supplémentaire.
2. Le rôle SQL public et son secret doivent être provisionnés en production avant une future activation; l'application refuse l'activation si l'URL dédiée manque.
3. Les avis npm historiques restent suivis séparément.
4. `pdftoppm` manque sur le poste Windows pour un test OCR historique indépendant.
5. WEB-AI-03 devra réaliser le grounding final, valider chaque citation avant affichage et préserver un coupe-circuit immédiat.

## Verdict

**VALIDATED_LOCAL_WITH_RESERVATIONS — prêt pour validation humaine WEB-AI-02 et préparation WEB-AI-03 seulement.**

Aucune fusion, aucun déploiement et aucun trafic Bedrock réel ne sont autorisés par ce rapport.
