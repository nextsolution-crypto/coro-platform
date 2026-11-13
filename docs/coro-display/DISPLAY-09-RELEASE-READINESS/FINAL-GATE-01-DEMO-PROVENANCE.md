# Gate 1A — provenance de démonstration

## Matrice de preuve

| Source | Classement | Constat |
|---|---|---|
| Workflow `43351101756` | Directe pour l'état de production | `demoFixtureCount=0`, `buildingFictitious=false` |
| `docs/demo-coro/DEMO-ENVIRONMENT-INVENTORY.md` | Corroborante | Le client et les projets préexistants sont à préserver; leur origine détaillée n'est pas présumée et ils ne sont pas enregistrés comme fixtures |
| `MIG-08-HOMEPAGE-GATE.md` commit `c6d2584c` | Corroborante | Tour Prémont est décrit comme identité de démonstration assainie et non comme client réel |
| `MIG-03D-INCIDENT-AUDIT.md` commit `418737fe` | Contradictoire / insuffisante | L'adresse apparaît dans un rendu; la provenance y est explicitement non confirmée |
| `seed-demo.ts` | Insuffisante | Le seed historique crée d'autres organisations et bâtiments; il ne crée pas ce Tour Prémont |
| Historique Git `-G Tour Prémont` sur les scripts/seed | Insuffisante | Aucun script de création canonique retrouvé |

Les titres PMU/PCA, le nom du tenant, l'apparence du portail et les médias marketing ne constituent pas une preuve directe de création synthétique. Aucun journal canonique de création, seed déterministe ou métadonnée de provenance n'a été retrouvé.

**Verdict provenance : FAIL — DIRECT_PROVENANCE_NOT_DEMONSTRATED.** La documentation converge vers un usage Démo, mais les règles du gate interdisent de transformer cette convergence en preuve directe.
