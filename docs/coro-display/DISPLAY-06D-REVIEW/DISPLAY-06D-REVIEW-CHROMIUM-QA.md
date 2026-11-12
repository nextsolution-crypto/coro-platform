# QA Chromium

## Exécution

Puppeteer/Chromium réel a capturé online, offline, urgence et redémarrage. La largeur naturelle consignée dans `restart-process.json` vaut 1 pixel. L'inspection des PNG montre un rendu noir synthétique identique; elle ne démontre donc ni un plan réaliste, ni les proportions, ni une différence perceptible des modes.

## Sécurité

Sandbox non désactivée, origine loopback, CSP et interception externe actives. Les tests Host/méthode/route complètent la recette.

## Limites

Les profils 17×11, 16:9 et 16:10 ne disposent pas chacun d'une inspection visuelle manuelle indépendante dans cette revue. Fidélité visuelle: NOT_VERIFIED. Kiosque plein écran matériel, focus OS et reprise après crash GPU: NOT_VERIFIED.
