# INC-RP-01 — Lot 2 — Résultats QA

## Candidat

- Branche: `feature/inc-rp-01-drafts-versions`
- Base: `6d79617b8407b8e203b6bcadb56bc923a0d3e6c1`
- Feature flag: `INCIDENT_REPORTS_ENABLED=false` par défaut

## Contrôles exécutés

| Contrôle | Résultat |
| --- | --- |
| Build Nest/TypeScript | PASS |
| Tests ciblés contenu, autorité, fondations et flag | PASS — 25/25 |
| Chaîne Prisma depuis zéro | PASS — 189 migrations |
| Test PostgreSQL Lot 2 | PASS — 3/3 |
| Création concurrente idempotente | PASS |
| Concurrence de modification / verrou optimiste | PASS |
| Immuabilité après soumission | PASS |
| Pagination bornée et total complet | PASS |
| Refus inter-tenant non révélateur | PASS |
| Unicité des clés d'idempotence d'audit | PASS |
| Audit npm des dépendances de production | PASS — 0 vulnérabilité |
| Validation Prisma | PASS |

Le diff global migrations→schéma signale une dette historique de dérive sur des
objets antérieurs au Lot 2. Cette dette n'est ni introduite ni corrigée par ce
lot; les deux colonnes et index du Lot 2 ont été validés par application complète
sur PostgreSQL jetable et par les tests fonctionnels ci-dessus.

## Limites intentionnelles

- Aucun moteur PDF.
- Aucun importateur Reportperfect complet.
- Aucune approbation ou publication commerciale.
- Aucun endpoint ClientUser.
- Aucun rapport réel et aucune notification.

Le lot demeure non exposé tant que le flag serveur n'est pas activé dans une
livraison ultérieure autorisée.
