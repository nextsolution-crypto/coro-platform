# Plan de déploiement contrôlé

Préflight : SHA explicite, CI PASS, sauvegarde/restauration démontrées, capacité, aucune release concurrente, permissions Display et tenant Démo vérifiés. Ordre : backend compatible (aucun changement ici), portail client, routage/DNS séparément autorisés, puis fixture synthétique via acteur interne habilité.

Smoke tests : santé services, connexion client, fiche bâtiment, lien Display autorisé/refus non autorisé, bâtiment filtré, URL permanente, activation `WEB_VIEW_ONLY`, V1 puis V2, confirmation logicielle et révocation. NO-GO sur collision de bâtiment, portée ambiguë, publication non approuvée, DNS/TLS absent, ancien rollback incompatible ou échec multitenant.

Aucune étape de ce plan n'est exécutée par ce mandat.
