# Ordre d'amorçage de la préproduction (données synthétiques uniquement)

Méthode déjà exécutée en local pendant ce mandat (base PostgreSQL jetable) ; à industrialiser sur le VPS.

1. `prisma migrate deploy` (Prisma épinglé 6.19.3, exécuté via `node` dans le conteneur backend, jamais `npx` côté hôte) — 139 migrations.
2. Autorité de plateforme : organisation opératrice, Founder, délégué, administrateur sans permission, rôle seul, deux organisations clientes (administrateurs et conseillers), via les services du backend compilé (brouillon → activation → délégations). Mot de passe de test unique, domaine `preprod.test`.
3. `dist/src/seed-demo.js` (organisation, clients, bâtiments, projets PMU/PSI, mandats, activités, temps, commentaires) ; rattacher ses comptes au domaine `preprod.test`.
4. Comptes du portail client (gestionnaire avec permissions Sentinelle, corporatif) rattachés au client et aux bâtiments de démonstration.
5. Jetons de borne pour les bâtiments (écrans publics `/kiosk`, `/presence`).
6. Jeu de rendement : montants CAD, devise inconnue (UNKNOWN), mandat incomplet, marge négative (pour revoir le rendu financier sans erreur).
7. Contrôle de recette : balayage visuel + scénarios + parité RBAC de ce mandat, rejoués contre l'hôte de préproduction.

Interdits : toute copie de la production, tout courriel ou numéro réel, tout identifiant externe.
