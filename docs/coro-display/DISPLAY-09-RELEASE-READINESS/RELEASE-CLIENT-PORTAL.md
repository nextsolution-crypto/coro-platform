# Portail client

Le candidat ajoute le parcours fiche bâtiment → carte CORO Display → `/display?buildingId=…`, filtré côté serveur par l'intersection organisation/client/bâtiments autorisés. La permission requise est `DISPLAY_CLIENT_PLAN_READ`; le paramètre URL ne confère aucun droit.

Build immuable local PASS et route `/display` présente. Contrats portail PASS en CI. Après release : connexion légitime, fiche du bâtiment canonique, carte conditionnelle, liste limitée, URL/version/statut, F5, mobile/desktop et refus hors portée. Production authentifiée : `NOT_VERIFIED` puisque le candidat n'est pas déployé.
