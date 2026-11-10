# DISPLAY-04A — File, reprises et nettoyage

États : `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `CANCELLED`. Les claims concurrents utilisent `SKIP LOCKED`. Les échecs d'autorité, d'intégrité, de PDF actif/chiffré/invalide ne sont pas rejoués. Les défauts transitoires ont un délai croissant et au plus trois tentatives.

Les répertoires temporaires aléatoires sont supprimés dans un `finally`, y compris après délai ou erreur. Les objets privés sont nommés par tenant, publication, job et SHA; l'upload immuable interdit l'écrasement. Une politique périodique d'expiration des sorties de jobs définitivement échoués reste à ajouter après définition de la rétention documentaire.
