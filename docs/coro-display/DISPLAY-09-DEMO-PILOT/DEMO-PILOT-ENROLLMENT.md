# Enrôlement Web

Le profil attendu demeure `WEB_VIEW_ONLY`. Le navigateur ouvre l'URL permanente, saisit une invitation temporaire, établit sa session et charge uniquement une publication autorisée. Les tests backend `display-web.service.spec.ts` couvrent les gardes essentiels; ils passent avec la suite ciblée.

`WEB_MANAGED_KIOSK` et `WEB_EMERGENCY_ELIGIBLE` ne sont ni activés ni proposés. L'activation Safari/iPad et la persistance matérielle restent **NOT_VERIFIED**.
