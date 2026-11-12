# Chromium

Une recette Chrome headless a été rejouée le 2026-11-12 contre l'image portail QA construite depuis le candidat et un fournisseur API strictement local. Résultat : `PASS`, cinq viewports (tablette portrait/paysage, 16:9, 16:10, 17:11), activation `PASS`, capacité `WEB_VIEW_ONLY`, et limite hors ligne confirmée sans promesse de permanence.

La première tentative a été bloquée par la CSP parce que le harnais utilisait `127.0.0.1` au lieu de l'origine `localhost:3002` déjà autorisée. Le paramètre de build QA a été corrigé; aucune CSP ni ligne de produit n'a été assouplie.

Le build local du portail confirme `/display` et `/d/[publicDisplayId]`. Une recette authentifiée Tour Prémont n'est pas possible avant déploiement/fixture et reste `NOT_VERIFIED`. Aucun PASS de production ou iPad n'est inféré des captures synthétiques.
