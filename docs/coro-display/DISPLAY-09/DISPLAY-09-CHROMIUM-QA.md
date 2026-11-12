# QA Chromium

Recette exécutée le 12 novembre 2026 avec Google Chrome installé, piloté par Playwright contre le build Next de la branche d'intégration et un backend synthétique local.

Résultats :

- tablette paysage 1280×800 : PASS;
- tablette portrait 800×1280 : PASS;
- écran 16:9 1920×1080 : PASS;
- écran 16:10 1920×1200 : PASS;
- écran 17×11 1700×1100 : PASS;
- première ouverture et code à six chiffres : PASS;
- activation WebCrypto P-256 synthétique : PASS;
- profil affiché `WEB_VIEW_ONLY`, urgence réelle non admissible : PASS;
- rechargement hors ligne : limite explicitement reproduite, aucune garantie permanente annoncée.

La première exécution a découvert que la CSP statique bloquait l'hydratation Next.js. Le correctif utilise un nonce par requête et un hash borné pour le script de thème, sans `unsafe-inline` dans `script-src`. La recette a ensuite réussi sans erreur CSP.

Captures réelles : `chromium-evidence/`. La validation sur tablette physique, MDM, éviction de cache et kiosque OS reste `NOT_VERIFIED`.
