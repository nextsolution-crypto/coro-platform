# Autorisation

Les commandes passent par JWT, statut d’organisation actif et `SpatialAuthorizationService`. Elles exigent une permission explicite et une affectation au bâtiment : activation (`DISPLAY_EMERGENCY_ACTIVATE`), sortie (`DISPLAY_EMERGENCY_RESET`) ou contexte (`DISPLAY_COMMAND`). ADMIN/SUPER_ADMIN n’accorde aucun droit implicite.

La sortie en deux temps refuse le même acteur entre demande et approbation. Une urgence réelle exige un incident actif du même tenant et bâtiment.
