# DISPLAY-05A-INTEGRATION — Frontend

## Fonctionnalités intégrées

La route `/display` est produite par le build Next.js et la navigation est affichée seulement avec `DISPLAY_READ`. La page fournit tableau de bord, arbre bâtiment/étage/zone, emplacements, bibliothèque, recherche, filtres, états vides/chargement/erreur, historique et création depuis une source admissible.

Les actions documentaires utilisent les routes gouvernées existantes : aperçu, soumission, revue, refus, approbation exacte, publication, suspension, reprise et révocation. Les actions sensibles demandent confirmation. Aucun appareil ni état de diffusion fictif n'est inventé.

## Sécurité

Les aperçus sont téléchargés comme blobs authentifiés. Le client ne reçoit ni `variantStorageKey` ni URL permanente. Les permissions UI ne remplacent jamais les contrôles serveur.

## Validation

- Contrat frontend : PASS.
- TypeScript : PASS.
- ESLint page : 0 erreur, 1 avertissement attendu pour l'image blob privée.
- Build Next.js 16.4.2 : PASS, 75 pages, `/display` statique.
- `prefers-reduced-motion`, dialogue nommé, libellés et breakpoints 1100/760 présents.

## Réserve

Rendu visuel, clavier et débordements réels : `NOT_VERIFIED` faute de connecteur navigateur.
