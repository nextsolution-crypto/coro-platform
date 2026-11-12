# Urgence

`EmergencyStateStore` protège l'état par HMAC, version et priorité. Le Player principal relit cet état au démarrage et applique le mode avant l'affichage.

Le scénario a persisté `EMERGENCY_REAL`, recréé le store, restauré l'urgence, refusé un downgrade non gouverné, puis accepté la sortie avec `governedClear: true`. Aucun déclenchement réel ou retour automatique n'a été utilisé.
