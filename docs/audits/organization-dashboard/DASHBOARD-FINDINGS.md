# Registre des constats du dashboard

## Réconciliation du lot de correction — 2026-10-26

| ID | Statut après correction | Preuve actuelle |
|---|---|---|
| DASH-001 | CLOSED_QA | `dashboard-scope.spec.ts` (7/7) et campagne réelle PostgreSQL/API : OPERATOR limité à ses projets affectés pour listes, recherche, mises à jour, activités, délais et tâches; ADMIN conserve la portée organisationnelle; aucune donnée de l'organisation B. |
| DASH-002 | CLOSED_QA | `Promise.allSettled`, erreurs principale/partielles explicites, retry local et scénario navigateur de panne secondaire PASS. |
| DASH-003 | CLOSED_QA | Source canonique retenue : `ProjectTask` affectée à l'acteur, non terminée et échue, filtrée par `projectAccessWhere(actor)` via `/projects/dashboard/late-tasks`. |
| DASH-004 | CLOSED_QA | Résumé scalaire administrateur `activeOperatorCount`; identité inactive exclue et erreur affichée comme indisponible. |
| DASH-005 | CLOSED_QA | Liens et boutons natifs; aucun `div[role=button]` résiduel dans les 12 configurations mesurées. |
| DASH-006 | CLOSED_QA | Erreur principale accessible, KPI non trompeurs et nouvelle tentative. |
| DASH-007 | PARTIAL_PRODUCT | Fraîcheur réelle affichée. Les définitions commerciales détaillées des KPI restent une amélioration produit non bloquante. |
| DASH-008 | CLOSED_QA | 12/12 : 390×844, 768×1024, 1440×900 et 2560×1440, Classic/Glass Light/Glass Dark; aucun overflow global/composant et aucune erreur console critique. |
| DASH-009 | CLOSED_QA | MFA réelle du lab; utilisateur inactif refusé; session persistée/F5 exercés dans la matrice. |
| DASH-010 | CLOSED_QA_SCOPE | Navigation native du dashboard vérifiée; aucune prétention sur les actions métier des écrans de destination hors périmètre. |

Preuves structurées et captures : `D:\CORO-QA\runs\org-dashboard\acceptance`. La preuve est synthétique et locale; la vérification production reste à effectuer après la release gouvernée.

| ID | Catégorie | Gravité | Statut | Emplacement | Constat et preuve | Critère de recette |
|---|---|---:|---|---|---|---|
| DASH-001 | Sécurité / périmètre | Haute | FAIL | `projects.controller/service`, `activities.controller/service`, recherche du shell | Les endpoints secondaires prennent seulement `organizationId`, contrairement à `/projects` qui emploie `projectAccessWhere(actor)`. | Deux organisations et deux OPERATOR d'une même organisation : chaque widget, compteur et résultat de recherche ne contient que les projets autorisés; aucun identifiant étranger ni métadonnée annexe. |
| DASH-002 | Résilience / exactitude | Haute | FAIL | `dashboard/page.tsx:76-83` | Cinq erreurs deviennent `{ data: [] }`; l'interface annonce ensuite zéro ou « aucune donnée ». | Chaque panne reçoit un état indisponible distinct; les données saines restent visibles; 401/403 provoquent le traitement de session/refus approprié. |
| DASH-003 | Fonctionnel | Haute | FAIL | `dashboard/page.tsx:59,486-515` | `lateTasks` n'est jamais chargé ni assigné; « Aucune tâche en retard » est toujours affiché. | Fixture avec tâche échue/non échue : compteur, identité, échéance et destination exacts; panne distincte d'une liste vide. |
| DASH-004 | Exactitude | Moyenne | FAIL | `dashboard/page.tsx:126` | `projets.length >= 0` est toujours vrai; la présence d'un conseiller n'est pas vérifiée. | Organisation sans conseiller : étape incomplète. Avec conseiller actif : étape complète. |
| DASH-005 | Accessibilité | Moyenne | FAIL | cartes KPI, approbations, activités, projets récents | Surfaces `div` et `tr` avec `onClick`, sans rôle/tabIndex/activation clavier ni nom accessible propre. | Toutes les actions sont atteignables avec Tab, visibles au focus et activables avec Entrée/Espace; annonce correcte par lecteur d'écran. |
| DASH-006 | Résilience | Moyenne | FAIL | `fetchAll()` | L'erreur principale est uniquement envoyée à `console.error`; aucun message ou retry. | Erreur `/projects` : message accessible, aucun faux KPI, bouton Réessayer idempotent. |
| DASH-007 | Clarté | Faible | DÉCISION_PRODUIT_REQUISE | KPI et titres | Les définitions, la fraîcheur et le périmètre ne sont pas affichés. | Libellés/infobulles approuvés; date de fraîcheur réelle; distinction nombre/score/tendance. |
| DASH-008 | Responsive | Moyenne | NOT_VERIFIED | tableau 7 colonnes et navigation | Anciennes preuves de Design System disponibles, mais aucune matrice fraîche 390/768/1440/2560 sur ce SHA avec sessions ADMIN/OPERATOR. | Mesures globales et par composant dans les thèmes proposés, navigation ouverte/repliée, textes longs et grands nombres. |
| DASH-009 | Route et session | Haute | NOT_VERIFIED | JWT, `OrganizationStatusGuard`, store d'authentification | Les endpoints sont protégés et un SUPER_ADMIN actif charge la production. Révocation/désactivation non rejouée. | Utilisateur désactivé et session expirée refusés serveur; aucune donnée résiduelle après déconnexion. |
| DASH-010 | Navigation | Faible | NOT_VERIFIED | boutons et routes du dashboard | Les destinations codées existent; le rendu production expose correctement les actions SUPER_ADMIN, mais elles n'ont pas toutes été exécutées par rôle. | Exécuter chaque destination autorisée/refusée sous ADMIN et OPERATOR, puis retour/F5. |

## Limites de preuve

- L'observation production était strictement sans mutation et concernait un SUPER_ADMIN; elle ne prouve pas les restrictions OPERATOR.
- Les contrats existants valident la présence de composants et l'ancien correctif d'approbation, pas l'exactitude des agrégations.
- Aucune panne serveur n'a été provoquée en production.
- Aucune donnée réelle d'une autre organisation n'a été consultée.

