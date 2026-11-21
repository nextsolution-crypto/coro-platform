# DNS, TLS et routage

Controle public du 2026-11-12 : `display.getcoro.io` retourne `NXDOMAIN`; aucune connexion TLS n'est donc possible. `client.getcoro.io` repond via Cloudflare/Next.js.

Changement propose pour la phase B :

- creer un enregistrement DNS approuve pour `display.getcoro.io` vers le meme point d'entree gouverne que le portail, selon la topologie reelle du reverse proxy;
- ajouter le nom a la configuration du reverse proxy et au certificat TLS;
- router uniquement le Player Web permanent, sans exposer les rendus prives ni les routes d'administration;
- conserver l'URL opaque, les cookies Secure/HttpOnly/SameSite adaptes, la CSP et les origines autorisees;
- verifier redirection HTTP vers HTTPS, certificat, SNI, cache et absence de directory listing.

La valeur cible DNS, le fournisseur DNS et la configuration TLS ne sont pas demontres par le depot : ils doivent etre releves avant changement. Aucun DNS ou certificat n'a ete modifie.
