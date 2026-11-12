# Intégration CORO Incident

Une urgence réelle ou une source CORO_INCIDENT exige un `IncidentEvent` actif, du même tenant et bâtiment, avec classification exercice cohérente. La création de commande ajoute une entrée `IncidentLog` dans la même transaction.

La sortie doit viser l’incident actif de la demande. DISPLAY-07 ne crée ni ne ferme un incident et ne remplace pas ses transitions métier.
