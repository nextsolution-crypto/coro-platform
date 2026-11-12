# Hors ligne et reprise

Le serveur Nest est réellement arrêté après synchronisation. Chromium conserve le rendu local. Un processus Node distinct démarre avec Gateway indisponible, restaure le cache et relance Chromium sans nouveau téléchargement.

Limite connue : une révocation émise pendant la coupure n’est reçue qu’à la prochaine synchronisation. Le backoff de démarrage est borné.
