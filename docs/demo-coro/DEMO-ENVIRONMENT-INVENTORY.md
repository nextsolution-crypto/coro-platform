# Inventaire de l'environnement CORO Démo

## Cible canonique

- Organisation : `CORO Démo`
- Identifiant : `916f54ec-af22-45e0-99db-a369d9630002`
- Compte de référence : `demo@getcoro.io`
- Type : `User` interne au tenant, rôle `ADMIN`, actif
- Homonyme `ClientUser` : absent lors du contrôle en lecture seule

Le nom de profil « Démo CORO » n'est pas le nom de l'organisation. L'outillage refuse tout autre identifiant, nom, courriel, rôle ou collision d'identité.

## Données préexistantes à préserver

- Client `Groupe Immobilier Prémont`.
- Projets `PMU — Tour Prémont 2026` et `PCA — Tour Prémont 2026`.
- Au relevé assaini : 2 User, 4 ClientUser, 1 client, 3 bâtiments, 2 projets, 6 réservations, 8 incidents et 1 action corrective.

L'origine détaillée des données existantes n'est pas présumée. Elles ne sont ni renommées, ni supprimées, ni enregistrées comme fixtures du présent chantier.

## Références de preuve

- Contrôle de préparation production : workflow `41757756703`, succès, lecture seule.
- PR de l'inspecteur : #187 et #188, fusionnées.
- Production applicative observée avant ce lot : `e28eec4fb26288768e147ec08fada24b2d92140a`.

## État

`TARGET_VERIFIED_ISOLATED_DEMO`. Le provisionnement reste interdit tant que la protection produit, la migration, le QA local et les gates de livraison ne sont pas terminés.
