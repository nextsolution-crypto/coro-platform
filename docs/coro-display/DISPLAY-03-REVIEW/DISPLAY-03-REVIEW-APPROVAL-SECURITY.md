# DISPLAY-03-REVIEW — Sécurité des approbations

Les permissions `READ`, `CREATE`, `REVIEW`, `APPROVE`, `PUBLISH`, `REVOKE` sont explicites et limitées aux bâtiments affectés. ADMIN et SUPER_ADMIN ne reçoivent aucun droit implicite.

L’auteur ne peut réviser ni approuver sa publication. Après correction, le réviseur ne peut plus être l’approbateur. Le publieur est contrôlé séparément. Les appels API directs passent les mêmes contrôles JWT, tenant, bâtiment, permission, statut, verrou optimiste et autorité documentaire.

Chaque décision crée dans la transaction un événement append-only et un audit d’administration. Les refus n’écrivent ni nouvel état ni nouvelle preuve.

Les tests PostgreSQL couvrent refus inter-bâtiment, auto-revue, réviseur-approbateur, suspension, reprise, révocation et refus Player post-révocation. Une matrice inter-tenant plus exhaustive reste recommandée avant exposition aux appareils.
