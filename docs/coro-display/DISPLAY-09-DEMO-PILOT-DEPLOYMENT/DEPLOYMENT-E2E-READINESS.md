# Preparation E2E

Sur le candidat exact `5a6a3f60416222ef0e6363e999238d77a4490605`, la recette isolee a :

- applique 187 migrations PostgreSQL 16 depuis zero;
- confirme un second `migrate deploy` sans migration en attente;
- execute le backend Nest reel, stockage prive et Chromium/Puppeteer;
- couvert trois organisations, enrôlement, publication, manifeste, cache/hors-ligne, synchronisation et revocation;
- termine `display-06c-operational-e2e.spec.ts` en PASS.

La CI post-fusion `43321546408` a reussi les typechecks des quatre applications, tous les tests backend/PostgreSQL et le build du portail. Aucun binaire de production n'a ete construit par ce run.

Avant phase B : construire les images, appliquer les migrations sur la restauration de verification, puis executer les smoke tests authentifies. L'import interactif V1/V2 et la navigation du batiment canonique restent a demontrer apres deployment.
