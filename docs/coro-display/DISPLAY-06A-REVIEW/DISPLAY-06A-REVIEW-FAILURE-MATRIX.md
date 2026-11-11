# DISPLAY-06A-REVIEW — Matrice de panne

| Panne | Détection/comportement | Limite |
|---|---|---|
| Réseau/DNS/serveur/TLS | synchronisation échoue; dernier plan admissible | supervision future |
| Manifeste invalide | refus avant cache | aucune |
| Plan corrompu | SHA-256 échoue; ancien plan conservé | aucune logique |
| Stockage plein/écriture interrompue | stage/commit échoue | test disque futur |
| Cache absent | état dégradé sans faux plan | écran futur |
| Crash/redémarrage/panne électrique | noyau non persistant | DISPLAY-06B |
| Horloge future | manifeste refusé | source de temps sécurisée future |
| Clé/plan révoqué | refus connu | révocation distante inconnue hors ligne |
| Mauvais profil | géométrie refusée | rendu matériel futur |
| Synchronisations concurrentes | tokens de stage distincts | verrou disque futur |

Le journal prévu doit tracer la dégradation sans conditionner l'affichage du plan.
