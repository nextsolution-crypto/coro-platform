# Recette visuelle

Chromium headless réel charge l’origine loopback avec CSP effective. Le style mesure `object-fit: contain` et interdit le débordement. Les profils synthétiques 17×11, 16:9 et 16:10 sont testés sans document client.

Captures : [17×11](evidence/display-06c-review-17x11.png), [16:9](evidence/display-06c-review-16x9.png) et [16:10](evidence/display-06c-review-16x10.png). Les trois contrôles rapportent `scrollX=false`, `scrollY=false` et l’hôte `127.0.0.1`.

La recette kiosk graphique, l’écran physique, le plein écran OS et les permissions matérielles restent `NOT_VERIFIED`.
