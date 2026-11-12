# Hors ligne et reprise

Après arrêt réel du serveur Nest du scénario, Chromium a rechargé l'origine locale et conservé le rendu. Une nouvelle instance `ConnectedPlayerService` a relu et vérifié le cache sans Gateway.

Le Player principal effectue des tentatives bornées et conserve le cache après erreur. Une révocation distante inconnue ne peut pas être découverte hors ligne; cette limite est explicitement conservée.
