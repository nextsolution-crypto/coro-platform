# Authentification M2M HTTP

`DeviceGatewayHttpClient` obtient un challenge, signe device ID, timestamp, nonce, méthode, chemin et empreinte canonique du corps. Le serveur vérifie exactement ces valeurs et consomme le nonce transactionnellement.

HTTP est accepté uniquement sur loopback; ailleurs HTTPS est obligatoire. Les redirections sont refusées et `AbortSignal.timeout` borne les appels. Le Player principal applique trois tentatives au maximum avec délais 0/1/3 secondes.
