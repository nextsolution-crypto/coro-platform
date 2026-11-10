# Permissions

| Fonction | Permission |
|---|---|
| Entrer dans le gestionnaire | `DISPLAY_READ` + affectation bâtiment |
| Lire les plans / variantes | `DISPLAY_PLAN_READ` |
| Voir les PDF admissibles / créer | `DISPLAY_PLAN_CREATE` |
| Revoir / refuser | `DISPLAY_PLAN_REVIEW` |
| Approuver | `DISPLAY_PLAN_APPROVE` |
| Publier / reprendre | `DISPLAY_PLAN_PUBLISH` |
| Suspendre / révoquer | `DISPLAY_PLAN_REVOKE` |
| Lire les événements | `DISPLAY_AUDIT_READ` |

Chaque requête agrégée exige même organisation, utilisateur actif, organisation active et bâtiments présents dans `displayBuildingIds`. Aucun rôle d'administration ne contourne ces règles.
