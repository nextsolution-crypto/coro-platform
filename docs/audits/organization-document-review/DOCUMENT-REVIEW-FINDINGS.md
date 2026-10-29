# Constats consolidés — révision et approbation documentaire

Candidate : branche `audit/organization-document-review`, migration
`20261113010000_document_review_integrity`, PostgreSQL 16 jetable.

| ID | Gravité | Statut candidat | Correction / preuve |
|---|---:|---|---|
| REVIEW-001 | CRITICAL | CORRIGÉ_QA | Soumission liée à document, version, lockVersion, snapshot et SHA-256; une modification ultérieure produit `REVIEW_CONTENT_CHANGED`. |
| REVIEW-002 | CRITICAL | CORRIGÉ_QA | Décision, version, transition, audit et outbox atomiques sous verrou PostgreSQL; concurrence idempotente. |
| REVIEW-003 | HIGH | CORRIGÉ_QA | Observations protégées par l'autorité du projet parent; opérateur non affecté refusé sans écriture. |
| REVIEW-004 | HIGH | CORRIGÉ_QA | Archive, projet inactif et état non mutable refusés avant effet secondaire. |
| REVIEW-005 | HIGH | CORRIGÉ_QA | `canApprove` utilise l'autorité serveur et expose l'identité de la soumission. |
| REVIEW-006 | HIGH | CORRIGÉ_QA | `canEdit` applique portée, rôle et état mutable canoniques. |
| REVIEW-007 | MEDIUM | CORRIGÉ_DANS_PÉRIMÈTRE | Retour en correction avec motif serveur obligatoire; alias historique `reject` aligné. Un rejet métier distinct reste une évolution. |
| REVIEW-008 | HIGH | CORRIGÉ_QA | Audit typé dans la transaction; aucun double audit sur les routes historiques. |
| REVIEW-009 | MEDIUM | PARTIAL | Outbox `PENDING/DELIVERED/FAILED`; décision indépendante du fournisseur. PDF officiel séparé. |
| REVIEW-010 | MEDIUM | DÉCISION_ATTENDUE | Autorité actuelle ADMIN/SUPER_ADMIN; affectation nominative et quorum non introduits sans règle métier. |
| REVIEW-011 | MEDIUM | NOT_VERIFIED | Matrice Chrome authentifiée et lecteur d'écran réel non démontrés. |
| REVIEW-012 | HIGH | CORRIGÉ_QA | Délai de concurrence Prisma borné (`maxWait=10 s`, `timeout=15 s`); test simultané PostgreSQL PASS. |

## Limites restantes

- complétude métier PMU/PSI/PCA avant soumission non formalisée;
- affectation explicite/quorum : décision produit;
- navigateur authentifié, responsive et accessibilité réelle : `NOT_VERIFIED`;
- export PDF final, signature et livraison fournisseur : hors acceptation.
