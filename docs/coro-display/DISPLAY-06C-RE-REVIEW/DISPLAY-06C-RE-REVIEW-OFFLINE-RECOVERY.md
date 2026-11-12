# Hors ligne et reprise

Après synchronisation, le backend HTTP est arrêté. La page Chromium déjà ouverte recharge le rendu via l’origine locale. Un nouveau processus démarre ensuite avec un Gateway volontairement indisponible, restaure le cache et produit `restart.png`.

La reconnexion réseau après coupure n’est pas une preuve de superviseur OS longue durée; le retry borné existe dans `connected-player-main.ts`. Limite : une révocation émise pendant la coupure n’est connue qu’à la prochaine synchronisation.
