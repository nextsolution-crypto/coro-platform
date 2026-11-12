# Chromium et CSP

Chromium headless réel charge exclusivement l’origine loopback fournie par `LocalPlayerOrigin`. La CSP commence par `default-src 'none'`; le rendu est servi par `/render`, sans script tiers ni clé privée dans la page. Le CSS utilise `object-fit: contain`.

Captures : `online.png`, `offline.png`, `restart.png`, `emergency.png`. Les profils 17×11, 16:9 et 16:10 sont validés par les tests de géométrie; le scénario intégré utilise 16:9. Recette kiosque physique : NOT_VERIFIED.
