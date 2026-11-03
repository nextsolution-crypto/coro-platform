# Administration gouvernée des autorisations Incident

## Autorité

L'administration appartient aux `ADMIN` et `SUPER_ADMIN` internes. Un `SUPER_ADMIN` utilise les routes plateforme avec une organisation cible explicite. Un `CLIENT_USER`, un `OPERATOR` ou un détenteur de `INCIDENT_COMMAND` ne reçoit aucun droit de délégation.

L'accès effectif reste l'intersection de deux autorités indépendantes :

1. `ClientUser.incidentPermissions` contient la permission demandée;
2. une `IncidentAuthorityAssignment` active contient cette permission dans la portée exacte du bâtiment ou de l'incident.

Le nouvel écran n'accorde aucune portée globale implicite. Un `CLIENT_MANAGER` ne peut recevoir une affectation que sur ses `buildingIds`; un `CLIENT_CORPORATE` reste borné aux bâtiments de son Client et de son organisation.

## Opérations

- lecture : identité, permissions individuelles, bâtiments admissibles, incidents actifs, affectations et permissions effectives;
- modification des permissions individuelles : motif obligatoire, état attendu et verrou transactionnel;
- attribution : permission individuelle et affectation enregistrées dans une transaction unique;
- révocation : verrou optimiste `lockVersion`, motif obligatoire et effet à la requête suivante;
- idempotence : clé persistée et empreinte du payload sur l'affectation.

Les trois permissions administrables sont explicitement limitées à `INCIDENT_READ`, `INCIDENT_SUPERVISE` et `INCIDENT_COMMAND`. `INCIDENT_TASK_PARTICIPATE` et `PCA_ACTIVATE` ne peuvent pas être ajoutées par ce parcours et leurs valeurs historiques sont préservées.

## Audit et concurrence

Toutes les mutations utilisent un verrou consultatif PostgreSQL commun par organisation et bénéficiaire. Les traces `AdminAuditEvent` conservent acteur, bénéficiaire, organisation, portée, avant/après, motif et identifiant de requête. Un rejeu compatible ne crée ni nouvelle affectation ni nouvel audit; un rejeu incompatible retourne `409`.

Le modèle ne supporte actuellement ni date d'effet future ni expiration. L'interface l'indique honnêtement : l'affectation prend effet immédiatement et reste active jusqu'à révocation. Aucun champ temporel fictif n'est ajouté.
