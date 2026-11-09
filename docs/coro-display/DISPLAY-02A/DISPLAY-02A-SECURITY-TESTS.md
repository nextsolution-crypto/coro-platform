# DISPLAY-02A — Tests de sécurité

## Garanties démontrées

| Contrôle | Résultat |
|---|---|
| ADMIN sans permission Display | PASS — 403 |
| DISPLAY_READ sur lecture | PASS |
| DISPLAY_READ sur mutation | PASS — refus |
| Permission de mutation explicite | PASS |
| Organisation de route différente de la session | PASS — refus avant lecture ressource |
| Bâtiment étranger | PASS — non énuméré |
| Zone avec étage étranger | PASS — aucune écriture |
| Emplacement avec zone d’un autre étage | PASS — aucune écriture |
| FK composite inter-tenant PostgreSQL | PASS — insertion directe refusée |
| Version optimiste obsolète | PASS — 409, aucun audit de succès |
| Archivage avec enfant actif | PASS — 409 |
| Audit création/modification/archivage | PASS |
| Urgence activate/reset distinctes | PASS au niveau contrat |

## Défense en profondeur

Chaque mutation vérifie l’acteur, le tenant, la permission, le bâtiment actif, la hiérarchie parent-enfant et la version. Les contraintes composites répètent les garanties au niveau PostgreSQL. Les DTO interdisent de forger `organizationId` ou `buildingId` dans le corps.

## Audit

`AdminAuditEvent` existant est réutilisé. Les événements contiennent acteur interne, organisation, type/identifiant/libellé de ressource, action, avant/après et requestId via `RequestContext`. Aucun secret ni donnée d’occupant n’est ajouté.

## Risques résiduels

- L’administration gouvernée des permissions Display n’est pas fournie dans 02A.
- Les refus restent couverts par les réponses HTTP et la télémétrie de requête existante; aucun second journal persistant de refus n’est inventé.
- Aucune route portail ClientUser n’est ouverte dans ce lot.
- Les commandes d’urgence, Player, appareils et publications ne sont ni implémentés ni testés opérationnellement.
