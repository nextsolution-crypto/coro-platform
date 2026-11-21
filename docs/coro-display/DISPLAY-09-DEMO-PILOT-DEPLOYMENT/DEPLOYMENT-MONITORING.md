# Monitoring et exploitation

Surveiller pendant et apres release : verrou de deploiement, etat des cinq conteneurs, redemarrages, sante PostgreSQL, tete de migration, erreurs backend/portail, latence API Display, jobs PDF, activations, synchronisations, heartbeats et refus d'autorite.

La release doit produire un manifeste SUCCESS reconciliant SHA, quatre digests, sauvegarde, restauration, migration et health checks. Une inspection independante doit ensuite confirmer le SHA actif.

Seuils d'arret immediat : migration partielle, conteneur instable, erreur 5xx persistante, fuite intertenant, publication non approuvee, activation etrangere, DNS/TLS incorrect, espace sous le gate ou verrou concurrent.

Capacite actuelle : environ 30,16 Go libres, 19,71 Go requis, marge 10,46 Go, statut HEALTHY. Aucun nettoyage n'est requis ni autorise par cette phase.
