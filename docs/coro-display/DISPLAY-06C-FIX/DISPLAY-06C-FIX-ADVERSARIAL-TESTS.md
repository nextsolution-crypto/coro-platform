# Tests adversariaux

Les refus vérifiés couvrent invitation utilisée/expirée/interceptée, mauvaise clé/signature, nonce rejoué/concurrent, corps/méthode/chemin altérés, appareil suspendu/révoqué, portée étrangère, manifeste/rendu substitué, séquence ancienne, cache corrompu et sortie d'urgence non gouvernée.

La réutilisation de l'invitation a aussi été exécutée sur le serveur HTTP réel du scénario principal et a retourné HTTP 410.
