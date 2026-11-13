# Revue indépendante

Revue de contrat séparée du code runtime :

- le script ne lit ni `.env` ni clé privée;
- il n'exécute aucun restart/reload/certbot;
- il valide cinq SNI et la chaîne;
- la solution proposée ne remplace pas le certificat partagé;
- Full (strict) n'est pas déclaré actif;
- DNS, TLS et production restent inchangés.

Réserve indépendante : le terminateur et le renouvellement doivent être confirmés par le workflow protégé avant GO ferme.
