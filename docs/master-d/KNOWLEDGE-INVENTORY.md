# CORO MASTER D — Knowledge inventory

Date d'audit : 2026-10-22. Baseline publiée : `286d186eeab846907985d9027c286e868c72181f`, migration 150.

## Sources inspectées

- Autorité canonique `ProjectFile`, stockage privé, versions, approbation, expiration, remplacement, révocation et coffre hors ligne sur `origin/main`.
- Branche historique préservée `coro-knowledge`, neuf commits de `78281de1` à `4b830ad3`.
- Services historiques d'ingestion PDF, recherche lexicale, projection sémantique, pgvector, citations, réponse fondée, évaluations et adaptateur AWS Bedrock.

## Inventaire

| Capacité | Production actuelle | Branche historique | Classement MASTER D |
|---|---|---|---|
| Document source privé | ProjectFile complet | Autorité `KnowledgeFile` séparée | PARTIAL — réutiliser ProjectFile uniquement |
| Versions et cycle de vie | ProjectFile complet | Cycle `KnowledgeDocumentVersion` parallèle | CONFLICT — ne pas intégrer tel quel |
| Approbation/effectivité/expiration | ProjectFile complet | Dupliqué | CONFLICT |
| Extraction PDF native | Absente | Implémentée avec PDF.js | IMPLEMENTED_UNPUBLISHED |
| OCR | Absent | Absent | MISSING |
| Pages, sections et chunks | Absents | Implémentés | IMPLEMENTED_UNPUBLISHED |
| Provenance et citations | ProjectFile fournit l'identité source; projection absente | Implémentée sur autorité parallèle | PARTIAL |
| Association bâtiment | ProjectFile via Project | Scope Knowledge séparé | PARTIAL |
| Association zone/équipement | Non démontrée | Non démontrée | MISSING |
| Index lexical | Absent | Implémenté | IMPLEMENTED_UNPUBLISHED |
| Index sémantique/pgvector | Absent | Fondation implémentée | IMPLEMENTED_UNPUBLISHED_NOT_REBASED |
| Révocation/supersession d'index | Autorité source disponible | Logique sur cycle parallèle | PARTIAL |
| Recherche autorisée | ProjectFile fail-closed | Filtre tenant, mais rôles internes seulement | PARTIAL_SECURITY_GAP |
| Réponses fondées et citations | Absentes | Implémentées avec fournisseur fake/Bedrock | IMPLEMENTED_UNPUBLISHED |
| Client Portal / UX | Aucun parcours Knowledge/AI canonique | Aucun parcours accepté 12/12 | MISSING |
| Intégration Incident/Ops/Sentinelle/Network | Sources disponibles | Non démontrée E2E | MISSING |

## Conclusion

La branche historique est une source de composants réutilisables, pas un candidat publiable. Son autorité documentaire parallèle contrevient à ProjectFile P-2.1/P-2.3. Aucun code historique ne doit être fusionné en bloc. Les extracteurs, structures de chunks, moteurs de recherche, validateurs de grounding et corpus d'évaluation peuvent être adaptés à une projection directement liée à ProjectFile.
