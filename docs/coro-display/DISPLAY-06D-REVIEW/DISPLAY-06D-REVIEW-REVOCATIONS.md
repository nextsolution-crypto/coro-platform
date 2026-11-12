# Révocations locales

## Constats

La liste connue est triée, dédupliquée et protégée par HMAC; le cache refuse une version connue révoquée. Une altération est détectée.

## Défauts

La liste est chargée une seule fois au démarrage. Son `updatedAt` n'est pas ancré dans un compteur persistant indépendant et un ancien registre correctement signé peut être rejoué. L'appareil hors ligne ne peut pas connaître une révocation distante postérieure.

## Verdict

Révocations connues avant coupure: PASS synthétique. Anti-rollback, fraîcheur et mise à jour après reconnexion: **FAIL/NOT_VERIFIED**. Ne pas présenter un plan hors ligne comme nécessairement à jour.
