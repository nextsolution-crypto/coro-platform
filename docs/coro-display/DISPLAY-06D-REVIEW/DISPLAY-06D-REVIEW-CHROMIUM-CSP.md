# Chromium et CSP

## Constats

La CSP refuse par défaut, objets, frames, formulaires et navigation externe. Les arguments interdisent `--no-sandbox`, debugging distant, extensions et désactivation de la sécurité. L'interception abort toute origine différente.

## Preuves

Tests runtime PASS. Chromium Puppeteer réel headless a affiché online/offline/urgence/redémarrage et produit les captures. Le premier lancement sandboxé a été refusé par l'environnement Windows; l'exécution autorisée suivante a abouti.

## Limites

Headless ne valide ni kiosque physique ni écran. Aucun test matériel de téléchargement/DevTools/permissions OS. Verdict: PASS logiciel, recette physique NOT_VERIFIED.
