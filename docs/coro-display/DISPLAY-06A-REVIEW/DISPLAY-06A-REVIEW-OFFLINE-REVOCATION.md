# DISPLAY-06A-REVIEW — Hors ligne et révocation

Un plan vérifié peut continuer hors ligne, mais l'état distingue intégrité, authenticité acquise à la synchronisation et actualité. Après réévaluation, le Player indique `FRESHNESS_UNCONFIRMED`; il ne prétend pas connaître les révocations survenues hors connexion.

Une révocation connue du plan ou de la clé est bloquante. Aucun retour automatique vers un ancien plan révoqué n'est permis. Sans plan admissible, le résultat attendu est un état dégradé, jamais un itinéraire inventé.
