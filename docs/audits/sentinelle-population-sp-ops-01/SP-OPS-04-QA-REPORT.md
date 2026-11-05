# SP-OPS-04 — Rapport QA

## Candidat local

Baseline `f071982edadcc6fba31d8663ab43d072cc20cc12`, modifications non fusionnées dans le worktree SP-OPS-01.

## Résultats exécutés

| Contrôle | Résultat |
|---|---|
| PopulationService ciblé | PASS — 302/302 |
| 9 suites Population critiques | PASS — 391/391 |
| rendu PDF de preuve Population isolé | PASS — 4/4 |
| Contrat UX gouvernance scientifique | PASS — 2/2 |
| SMS compliance portail | PASS — 5/5 |
| partage Population | PASS — 7/7 |
| autorité Sentinelle portail | PASS — 5/5 |
| TypeScript backend | PASS après génération Prisma |
| TypeScript portail | PASS |
| Build backend | PASS |
| Build portail | PASS |
| Suite backend globale | PARTIAL — 2 487 PASS, 5 SKIP, 4 FAIL : Poppler absent et trois timeouts de rendu sous contention; le rendu Population repasse 4/4 isolément |
| ESLint ciblé | PARTIAL — dette historique importante; les fichiers étaient déjà non conformes globalement |
| PostgreSQL réel | NOT_VERIFIED |
| Chrome réel et responsive | NOT_VERIFIED |

## Non-régressions ajoutées

- exclusion des empreintes scientifiques du ciblage;
- source expirée refusée avant lecture des abonnés;
- même secteur pour aperçu et roster figé;
- snapshot scientifique obsolète refusé sans écriture ni livraison;
- terminologie UX et avertissement contre le faux cercle scientifique.

## Communications

Aucun SMS, courriel, webhook ou appel fournisseur réel n'a été émis. Les tests utilisent des mocks ou adaptateurs locaux.
