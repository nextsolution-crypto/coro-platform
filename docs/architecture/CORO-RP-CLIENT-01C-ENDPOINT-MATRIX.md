# CORO-RP-CLIENT-01C — matrice des endpoints portail

Toutes les routes ci-dessous utilisent `ClientJwtGuard`. L'identité et les
permissions sont relues depuis `ClientUser`; aucun type d'acteur, tenant,
bâtiment ou droit fourni par le navigateur n'est accepté comme autorité.

| Domaine             | Préfixe client dédié                                              | Opérations                                                                                                                  | Permissions canoniques                                   |
| ------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Report              | `/client-portal/organizations/:organizationId/incident-reports`   | catalogue, modèles, CRUD brouillon, versions, soumission, file de révision, décisions, publication, pièces jointes, exports | `INCIDENT_REPORT_READ/CREATE/EDIT/REVIEW/APPROVE/EXPORT` |
| Main courante       | `/client-portal/organizations/:organizationId/operational-log`    | liste, détail, historique, création, correction, association rapport                                                        | `OPERATIONAL_LOG_READ/CREATE/EDIT`                       |
| Quarts et relève    | `/client-portal/organizations/:organizationId/operational-shifts` | liste, détail, planification, ouverture, préparation/décision de relève, fermeture, annulation                              | `OPERATIONAL_SHIFT_*`, `OPERATIONAL_HANDOVER_*`          |
| Consignes et suivis | `/client-portal/organizations/:organizationId/operations`         | consulter/créer/soumettre/approuver/publier/révoquer/confirmer; créer/lister/assigner/exécuter/vérifier/clôturer            | `OPERATIONAL_DIRECTIVE_*`, `OPERATIONAL_FOLLOWUP_*`      |

Les contrôleurs internes existants conservent `AuthGuard('jwt')` et leurs URL.
Un jeton interne ne satisfait donc pas les routes client, et un jeton client ne
satisfait pas les routes internes.

Les cinq feature flags existants restent les premiers garde-fous des services;
aucun entitlement par tenant n'est simulé dans ce lot.
