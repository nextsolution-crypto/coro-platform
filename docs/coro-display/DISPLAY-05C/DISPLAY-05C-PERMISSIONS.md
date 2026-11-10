# Permissions

Les droits sont explicites et vérifiés côté serveur: `READ`, `QUALIFY`, `ASSIGN`, `DECIDE`, `RESPOND`, `RESOLVE`, `CLOSE`, `AUDIT_READ` sous le préfixe `DISPLAY_OBSERVATION_`.

Aucun droit n'est déduit automatiquement d'un rôle ADMIN/SUPER_ADMIN. Un utilisateur doit être actif, appartenir à l'organisation et posséder une liste non vide de bâtiments explicitement autorisés. Un assignee doit aussi posséder `READ` sur le bâtiment concerné.
