# DISPLAY-09 — Recette visuelle V1

## Cause démontrée

Le rendu approuvé de Tour Prémont mesure `5100 × 3300` pixels, soit un rapport exact `17:11` à 300 DPI. Le backend associait toutefois le profil `ORIGINAL_17X11` à une résolution unique `4080 × 2640` (240 DPI), tandis que l'interface envoyait par défaut `SCREEN_16X9`. La recette était donc refusée malgré l'absence de modification du PDF, de la variante ou de l'emplacement.

## Correction ciblée

- Le backend valide le rapport gouverné (`17:11`, `16:9` ou `16:10`) plutôt qu'un nombre de pixels lié à un DPI particulier.
- Les versions, SHA-256, identifiants de variante et d'emplacement ainsi que les dimensions positives restent obligatoires et comparés à l'autorité serveur.
- L'interface déduit le profil depuis le rendu courant et ne demande plus à l'approbateur de choisir un profil technique.
- L'action de reprise est présentée comme « Vérifier à nouveau l'aperçu » et les empreintes techniques sont retirées du parcours courant.

## Validation locale

- Tests de recette visuelle et workflow à deux niveaux : 12/12 PASS.
- TypeScript backend : PASS.
- Build backend : PASS.
- Contrat frontend Display : PASS.
- Build et TypeScript frontend : PASS.

La publication de production et la recette Safari iPad restent distinctes de cette preuve locale.
