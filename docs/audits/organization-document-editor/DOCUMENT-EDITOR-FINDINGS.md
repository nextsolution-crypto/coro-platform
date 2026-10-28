# Constats — éditeur documentaire

Réconciliation du 2026-10-28. Ces statuts décrivent le candidat local, sans fusion ni déploiement.

| ID | Statut candidat | Correction et preuve |
|---|---|---|
| DE-001 XSS stockée | CORRECTED_QA | Assainissement serveur avec `sanitize-html`, politique explicite. Historique filtré à la lecture/export sans réécriture. Chrome 12/12 : aucun élément ni gestionnaire injecté. |
| DE-002 projet VALIDATED | CORRECTED_QA | Contrôle des états persistés; PUT 403, aucune écriture. |
| DE-003 projet ARCHIVED | CORRECTED_QA | PUT 403; lecture autorisée conservée. |
| DE-004 concurrence | CORRECTED_QA | `lockVersion`, verrou PostgreSQL et précondition atomique; résultat 200/409. |
| DE-005 lecture/modification | CORRECTED_WITH_MODEL_LIMIT | Autorité canonique `projectAccessWhere` et endpoints d’action distincts. Le modèle ne possède pas de permission documentaire plus fine qu’ADMIN ou OPERATOR affecté; aucun RBAC parallèle ajouté. |
| DE-006 endpoints secondaires | CORRECTED_QA | Modules 2/3/4/8 et procédures réutilisent l’autorité et les états communs. Aucun textarea en lecture seule, 12/12. |
| DE-007 versions sur validé | CORRECTED_QA | Création/restauration/suppression refusées sur état immuable; HTTP 403. |
| DE-008 snapshots de liste | CORRECTED_QA | Liste limitée aux métadonnées; lecture explicite autorisée, inter-tenant 404. |
| DE-009 saisie non sauvegardée | CORRECTED_PARTIAL_QA | État sale, `beforeunload`, confirmations section/langue/navigation. Panne 503 et réponse perdue restent NOT_VERIFIED. |
| DE-010 erreurs visibles | CORRECTED_PARTIAL_QA | Erreurs et conflits affichés sans effacer la saisie; reprise 503 non automatisée. |
| DE-011 validation hors portée | CORRECTED_QA | Portée projet canonique; lecture et mutation inter-tenant 404. |
| DE-012 audit | CORRECTED_QA | Audit existant avec acteur serveur, projet, document, opération et verrou; aucun contenu complet. |
| DE-013 route legacy | ACCEPTED_LIMIT | Les préférences Classic/Glass sont exercées sans prétendre à une interface Glass native. |
| DE-014 accessibilité | PARTIAL | Erreurs visibles; lecteur d’écran, zoom 200 % et focus modal restent NOT_VERIFIED. |

Seuls PMU, PSI et PCA ont été exécutés. PGC/PRA/PUE bénéficient des protections partagées, sans validation fonctionnelle complète. Aucun document réel n’a été réécrit ou purgé.
