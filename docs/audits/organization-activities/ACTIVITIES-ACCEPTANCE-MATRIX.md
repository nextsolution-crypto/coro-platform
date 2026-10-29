# Matrice d'acceptation — Activités

| Domaine | Scénario | Statut | Preuve/limite |
|---|---|---|---|
| Organisation | Navigation vers `/activities/portfolio` | PASS (contrat source) | Entrée présente dans `AppLayout`; pas de preuve navigateur réelle sur ce lot. |
| Organisation | Manager de portefeuille/admin voit les activités autorisées | PARTIAL | Politique de lecture projet appliquée par `/projects/:id/activities`; agrégation frontend limitée à 200. |
| Organisation | OPERATOR hors affectation — lecture directe projet | PASS (serveur) | `projectAccessWhere(actor)` sur `getActivities`. |
| Organisation | OPERATOR hors affectation — mise à jour/suppression/duplication/ICS | FAIL | ACT-003 à ACT-006. |
| Organisation | Erreur partielle et retry | FAIL | Erreurs par projet silencieuses. |
| Client | CLIENT_MANAGER — bâtiments affectés | PASS (contrat source) | `organizationId + clientId + buildingIds + clientVisible`. |
| Client | CLIENT_CORPORATE — portée client/organisation | PASS (contrat source) | Organisation et client imposés. |
| Client | Réservation d'une activité visible/réservable | PASS (tests existants ciblés) | Contrôles d'accès, état, disponibilité et transaction dans les services. |
| Client | Double réservation ouverte | PASS (test existant) | Conflit avant seconde création. |
| Client | Annulation et audit typé | PASS (contrat source) | Transaction, verrou et `clientUserId` dans AuditLog. |
| Confidentialité | Accès inter-organisation | PASS (contrat source), E2E NOT_VERIFIED | Tous les prédicats inspectés incluent l'organisation; campagne PostgreSQL dédiée absente. |
| Confidentialité | Accès intra-organisation hors projet | FAIL | Mutations/téléchargement/portfolio contournent l'affectation OPERATOR. |
| Notifications | Événement persisté, worker simulé, reprise, déduplication | NOT_VERIFIED | Aucun runner Activités intégré ne démontre toute la chaîne. |
| Responsive | 390/768/1440/2560 × 3 thèmes | NOT_VERIFIED | Frontend organisation absent du bootstrap QA permanent. |
| Accessibilité | Clavier, focus, zoom 200 % | NOT_VERIFIED | Même blocage runtime. |
| Accessibilité | Lecteur d'écran réel | NOT_VERIFIED | Aucun lecteur réel disponible pendant cet audit. |

## Verdict

`CORRECTION_REQUISE_AVANT_USAGE`

La fonction Client Portal dispose d'une base cohérente, mais l'écran organisation ne peut pas être accepté tant que la symétrie des autorisations directes/mutations, l'exhaustivité des agrégats et l'erreur partielle ne sont pas corrigées puis démontrées dans le runtime réel.
