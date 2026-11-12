# Persistance d’urgence

L’état contient mode, événement, source, priorité, version, autorisation et horodatage, protégé par HMAC. Les versions régressives et baisses de priorité sans `governedClear` sont refusées. Aucun timer ne termine l’urgence.

L’E2E démontre urgence synthétique persistée, crash/redémarrage, `emergencyRestored=true` puis sortie gouvernée. Aucune urgence réelle n’a été déclenchée.
