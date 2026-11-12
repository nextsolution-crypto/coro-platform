# Device Gateway

Endpoints ajoutés : `POST /device-gateway/commands` et `/commands/ack`. Ils réutilisent challenge, preuve Ed25519, nonce consommable, portée de méthode/chemin/corps et fenêtre temporelle DISPLAY-06.

Le polling ne retourne que les livraisons du device authentifié dans son tenant/bâtiment. La lecture marque DELIVERED et l’outbox DISPATCHED atomiquement. Aucun endpoint public de commande n’existe.
