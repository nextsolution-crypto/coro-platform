# Chromium

`LocalPlayerOrigin` sert le rendu activé sur `127.0.0.1`, avec CSP restrictive, `nosniff`, absence de cache et CSS `object-fit: contain`. Les flags dangereux, DevTools, téléchargements et origines externes sont refusés.

Chromium headless a décodé l'image réelle issue du Gateway (`naturalWidth > 0`) et produit `evidence/online.png`, `offline.png`, `restart.png` et `emergency.png`.
