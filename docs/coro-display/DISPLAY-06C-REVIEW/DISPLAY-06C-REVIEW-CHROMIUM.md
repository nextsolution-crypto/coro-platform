# Chromium

## Constats et preuves

Le serveur écoute uniquement `127.0.0.1`; les flags dangereux, DevTools, extensions et téléchargements sont interdits par politique. Le lancement headless réel confirme l’origine loopback et le rendu `contain`.

## Limites

L’exécutable ne configure pas un profil persistant durci, une allowlist de permissions Chromium ou un gestionnaire de navigation après lancement. Le mode kiosk non-headless et l’OS cible sont `NOT_VERIFIED`.
