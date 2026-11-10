# DISPLAY-03 — Approbation

Les permissions sont exactes et limitées au bâtiment : `DISPLAY_PLAN_READ`, `CREATE`, `REVIEW`, `APPROVE`, `PUBLISH`, `REVOKE`. Aucun rôle, y compris ADMIN/SUPER_ADMIN, ne reçoit un accès implicite.

L’auteur ne peut être le réviseur. L’approbateur doit être distinct de l’auteur et du réviseur. Le publieur possède une permission séparée. Chaque décision écrit dans la même transaction l’état, l’événement métier et `AdminAuditEvent`.

L’approbation porte sur le SHA du `ProjectFile`, sa version, le SHA de la variante et les paramètres spatiaux figés. Toute altération ou perte d’autorité bloque l’opération.
