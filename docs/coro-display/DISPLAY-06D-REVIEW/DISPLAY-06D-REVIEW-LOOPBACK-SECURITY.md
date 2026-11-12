# Sécurité loopback

## Correction

Le serveur demeure lié à `127.0.0.1` et refuse désormais méthode autre que GET, Host différent du `127.0.0.1:port` réellement alloué, adresse distante non loopback et route inconnue. Cette correction réduit DNS rebinding et exposition involontaire.

## Tests

Host hostile: 403; POST: 403; route inconnue: 404; CSP canonique: PASS.

## Limites

Un autre processus local du même hôte peut encore lire le rendu. Il n'existe pas de jeton local par session ni d'isolation IPC. Le serveur n'expose aucune commande privilégiée, mais la confidentialité locale du plan reste une réserve.
