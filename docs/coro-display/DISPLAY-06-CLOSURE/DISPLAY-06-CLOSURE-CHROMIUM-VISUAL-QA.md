# Recette visuelle Chromium

## Constat
Les anciennes preuves étaient noires et 1×1.

## Correction
La fixture sert un plan SVG synthétique 1920×1080 avec type MIME exact et attend le rendu avant capture.

## Preuve et tests
Profils 17×11 (1700×1100), 16:9 (1600×900), 16:10 (1600×1000), plus online/offline/emergency/restart (1280×720), tous non vides et inspectés.

## Résultat et risque résiduel
PASS logiciel; lisibilité à distance et colorimétrie de l'écran physique NOT_VERIFIED.

