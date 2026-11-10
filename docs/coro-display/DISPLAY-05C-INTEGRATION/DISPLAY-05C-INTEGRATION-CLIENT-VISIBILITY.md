# Visibilité client

Le portail DISPLAY-05B réutilise l’observation canonique. Le client voit uniquement les statuts et réponses communicables de ses propres observations. Les commentaires `INTERNAL`, événements professionnels, évaluations et identifiants internes restent exclus.

Les messages `CLIENT` sont persistés séparément; la visibilité portail reste limitée à l’auteur selon le contrat existant. Les scénarios PostgreSQL couvrent trois organisations, un auteur client, un client étranger et un identifiant deviné.

Contrats portail et Liquid Glass : PASS. Vérification visuelle authentifiée : `NOT_VERIFIED`.
