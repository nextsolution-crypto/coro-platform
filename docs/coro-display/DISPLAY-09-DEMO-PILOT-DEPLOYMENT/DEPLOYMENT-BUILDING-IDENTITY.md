# Identite de Tour Premont

L'inventaire gouverne `43326658664` a execute une transaction PostgreSQL explicitement `READ ONLY`.

Resultats verifies :

- organisation canonique `CORO Demo`, id `916f54ec-af22-45e0-99db-a369d9630002`;
- organisation active, non interne, avec une seule identite cible active de role ADMIN;
- `PMU - Tour Premont 2026` et `PCA - Tour Premont 2026` ont chacun une seule correspondance dans ce tenant;
- les deux projets appartiennent a `Groupe Immobilier Premont`;
- le tenant contient sept batiments.

Limite bloquante : l'inventaire existant ne retourne pas l'identifiant canonique du batiment correspondant a l'affichage « Tour Premont, 1200 boulevard Robert-Bourassa ». Un nom ou une adresse ne suffit pas. Avant toute fixture, une lecture gouvernee doit obtenir un unique tuple `organizationId/clientId/buildingId` et confirmer que le batiment est fictif/demonstration. Zero ou plusieurs correspondances imposent NO-GO.

Aucun document, occupant ou identifiant interne de batiment n'a ete lu ou modifie pendant la phase A.
