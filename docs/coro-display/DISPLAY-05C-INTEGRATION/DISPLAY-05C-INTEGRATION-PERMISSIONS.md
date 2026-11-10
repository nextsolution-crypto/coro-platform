# Permissions professionnelles

Les huit permissions sont :

- `DISPLAY_OBSERVATION_READ` : listes et détails;
- `QUALIFY` : qualification et mise en analyse;
- `ASSIGN` : attribution/réattribution;
- `DECIDE` : acceptation, refus, correction en cours;
- `RESPOND` : messages et demandes d’information;
- `RESOLVE` : validation de résolution;
- `CLOSE` : clôture;
- `AUDIT_READ` : historique professionnel.

Elles ne sont attribuées implicitement ni à `ADMIN` ni à `SUPER_ADMIN`. Chaque endpoint recalcule les droits depuis PostgreSQL. Une liste de bâtiments vide refuse l’accès. Les retraits de permission/périmètre prennent effet même sur un `requestId` déjà connu.

Preuves : tests lecture seule, permission manquante, bâtiment étranger, assigné étranger, révocation et mass assignment.
